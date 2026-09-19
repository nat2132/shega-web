"""Tests for the MoR taxpayer-verification gateway and its privacy contract."""
import json
from datetime import date
from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from licenses.models import LicensePlan, License

from .gateway import MorGatewayResult, map_official_response
from .models import MorVerificationEvent
from .verification import (
    STATUS_FAILED,
    STATUS_NOT_FOUND,
    STATUS_UNAVAILABLE,
    STATUS_VERIFIED,
    mask_tin,
    normalize_tin,
    tin_digest,
)


def _tin():
    return '0012814908'


def _setup_user(testcase, name='moruser'):
    owner = User.objects.create_user(
        username=name, email=f'{name}@x.com', password='pw12345'
    )
    owner.is_customer = True
    owner.business_name = 'Mor Biz'
    owner.save()
    if not LicensePlan.objects.filter(name='Pro').exists():
        LicensePlan.objects.create(name='Pro', duration_months=12, device_limit=5, price='50.00')
    plan = LicensePlan.objects.get(name='Pro')
    License.objects.create(
        customer=owner, plan=plan,
        start_date=date(2026, 1, 1), expiry_date=date(2027, 1, 1), device_limit=5,
    )
    refresh = RefreshToken.for_user(owner)
    owner.access = str(refresh.access_token)
    return owner


class NormalizeTests(TestCase):
    def test_strips_separators(self):
        self.assertEqual(normalize_tin(' 00-1281 4908 '), _tin())

    def test_rejects_short_and_letters(self):
        with self.assertRaises(Exception):
            normalize_tin('123')
        with self.assertRaises(Exception):
            normalize_tin('ABC1234567')

    def test_mask_keeps_edges(self):
        self.assertEqual(mask_tin(_tin()), '00******08')


class MapOfficialResponseTests(TestCase):
    def test_verified_mapping_whitelists_fields(self):
        raw = {
            'status': 'verified',
            'name': 'Aster Coffee PLC',
            'taxpayer_type': 'business',
            'registration': {'tin': _tin(), 'business_registration_no': 'R-99',
                             'address': 'Addis Ababa', 'evil_field': 'dropped'},
            'reference': 'mo-ref-1',
        }
        result = map_official_response(_tin(), None, raw)
        self.assertEqual(result.status, STATUS_VERIFIED)
        self.assertEqual(result.taxpayer_name, 'Aster Coffee PLC')
        self.assertEqual(result.reference, 'mo-ref-1')
        self.assertNotIn('evil_field', result.registration)

    def test_not_found_mapping(self):
        result = map_official_response(_tin(), None, {'status': 'not_found'})
        self.assertEqual(result.status, STATUS_NOT_FOUND)

    def test_unrecognised_code_is_honestly_unavailable(self):
        result = map_official_response(_tin(), None, {'status': 'maybe'})
        self.assertEqual(result.status, STATUS_UNAVAILABLE)


class StubSeam:
    """Fake gateway factory: patched-in class whose instances answer a queue."""

    def __init__(self, results):
        self._queue = list(results)
        self.calls = 0

    def __call__(self):
        return self

    def verify(self, tin, sub_tin=None):
        self.calls += 1
        return self._queue.pop(0) if self._queue else None


class MorVerifyEndpointTests(TestCase):
    def setUp(self):
        cache.clear()  # LocMem cache is process-wide; start each test clean.
        self.user = _setup_user(self)
        self.path = reverse('mor-verify-tin')

    def _post(self, payload, token=True):
        headers = {}
        if token:
            headers['HTTP_AUTHORIZATION'] = f'Bearer {self.user.access}'
        return self.client.post(self.path, data=json.dumps(payload),
                                content_type='application/json', **headers)

    def test_requires_auth(self):
        res = self._post({'tin': _tin()}, token=False)
        self.assertEqual(res.status_code, 401)

    def test_invalid_tin_400(self):
        res = self._post({'tin': '123'})
        self.assertEqual(res.status_code, 400)
        self.assertIn('tin', res.json())

    def test_unconfigured_gateway_is_unavailable_not_verified(self):
        result_cache = MorVerificationEvent.objects.filter(status=STATUS_VERIFIED).count()
        res = self._post({'tin': _tin()})
        body = res.json()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(body['status'], STATUS_UNAVAILABLE)
        self.assertEqual(body['reason'], 'mor_integration_not_configured')
        self.assertIsNone(body['taxpayer_name'])
        self.assertEqual(MorVerificationEvent.objects.filter(status=STATUS_VERIFIED).count(), result_cache)

    def test_full_tin_never_persisted(self):
        self._post({'tin': _tin(), 'sub_tin': 'BR1'})
        event = MorVerificationEvent.objects.get()
        self.assertNotEqual(event.tin_masked, _tin())
        self.assertNotIn(_tin(), event.tin_masked)
        persisted = json.dumps(model_to_dict(event))
        self.assertNotIn(_tin(), persisted)

    def test_cached_answer_surfaces_after_live_call(self):
        stub = StubSeam([MorGatewayResult(
            status=STATUS_VERIFIED, tin=_tin(), taxpayer_name='Aster PLC',
            reference='ref-1', verified_at='2026-09-07T10:00:00Z',
        )])
        with mock.patch('mor.views.MorGatewaySeam', stub):
            first = self._post({'tin': _tin()}).json()
            self.assertEqual(first['status'], STATUS_VERIFIED)
            self.assertEqual(first['source'], 'mor')
            self.assertEqual(stub.calls, 1)
            second = self._post({'tin': _tin()}).json()
            self.assertEqual(second['source'], 'backend')
            self.assertEqual(second['taxpayer_name'], 'Aster PLC')
            self.assertEqual(stub.calls, 1)

    def test_force_bypasses_cache(self):
        stub = StubSeam([MorGatewayResult(
            status=STATUS_VERIFIED, tin=_tin(), taxpayer_name='Aster PLC', reference='ref-1',
        )] * 2)
        with mock.patch('mor.views.MorGatewaySeam', stub):
            self._post({'tin': _tin()})
            self._post({'tin': _tin(), 'force': True})
            self.assertEqual(stub.calls, 2)

    @override_settings(MOR_CACHE_SECONDS=0)
    def test_transient_failure_not_cached(self):
        stub = StubSeam([MorGatewayResult(
            status=STATUS_UNAVAILABLE, tin=_tin(), reason='mor_unreachable',
        )] * 2)
        with mock.patch('mor.views.MorGatewaySeam', stub):
            self._post({'tin': _tin()})
            self._post({'tin': _tin()})
            self.assertEqual(stub.calls, 2)


def model_to_dict(obj):
    return {f.name: str(getattr(obj, f.name)) for f in obj._meta.fields}