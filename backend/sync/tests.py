import hashlib
import json
from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from licenses.models import LicensePlan, License
from .models import SyncDevice, AuditChainCommit
from .authorization import hash_device_key
from .audit_chain import (
    AUDIT_GENESIS,
    verify_business_audit_chain,
    submit_audit_chain,
    chain_from_sync_records,
)


def _chain(n):
    """Build a realistic chained record list of length n (prev_hash == prior hash)."""
    records = []
    prev = AUDIT_GENESIS
    for i in range(n):
        h = hashlib.sha256(f'{prev}|event-{i}'.encode()).hexdigest()
        records.append({'seq': i + 1, 'prev_hash': prev, 'hash': h})
        prev = h
    return records, prev


class CloudSyncAPITests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='cloudowner', email='cloudowner@x.com', password='pw12345'
        )
        self.owner.is_customer = True
        self.owner.business_name = 'Cloud Biz'
        self.owner.save()
        plan = LicensePlan.objects.create(name='Pro', duration_months=12, device_limit=5, price='50.00')
        self.license = License.objects.create(
            customer=self.owner, plan=plan,
            start_date=date(2026, 1, 1), expiry_date=date(2027, 1, 1), device_limit=5,
        )
        refresh = RefreshToken.for_user(self.owner)
        self.access = str(refresh.access_token)
        self.d1 = 'device-uuid-123'
        self.d2 = 'device-uuid-456'

    def _auth(self, device_id, key=None):
        headers = {'HTTP_AUTHORIZATION': f'Bearer {self.access}', 'HTTP_X_DEVICE_ID': device_id}
        if key:
            headers.pop('HTTP_AUTHORIZATION', None)
            headers = {'HTTP_X_DEVICE_KEY': key}
        return headers

    def _post(self, path, data, device_id=None, key=None):
        return self.client.post(path, data=json.dumps(data), content_type='application/json',
                                **self._auth(device_id, key))

    def _get(self, path, device_id=None, key=None):
        return self.client.get(path, **self._auth(device_id, key))

    def test_push_accepts_and_is_idempotent(self):
        r = self._post(reverse('sync:push'), {
            'device_id': self.d1, 'device_name': 'Terminal A',
            'changes': [
                {'entity': 'items', 'entity_uuid': 'item-uuid-1', 'op': 'INSERT', 'seq': 1,
                 'payload': {'name': 'Widget'}, 'checksum': 'abc'},
                {'entity': 'sales', 'entity_uuid': 'sale-uuid-1', 'op': 'INSERT', 'seq': 2,
                 'payload': {'saleId': 'S1'}, 'checksum': 'def'},
            ],
        }, device_id=self.d1)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['accepted'], 2)

        # Re-push the same batch: no duplicates.
        r2 = self._post(reverse('sync:push'), {
            'device_id': self.d1,
            'changes': [
                {'entity': 'items', 'entity_uuid': 'item-uuid-1', 'op': 'INSERT', 'seq': 1,
                 'payload': {'name': 'Widget'}, 'checksum': 'abc'},
                {'entity': 'sales', 'entity_uuid': 'sale-uuid-1', 'op': 'INSERT', 'seq': 2,
                 'payload': {'saleId': 'S1'}, 'checksum': 'def'},
            ],
        }, device_id=self.d1)
        self.assertEqual(r2.json()['accepted'], 0)

    def test_pull_scopes_other_branches_only(self):
        self._post(reverse('sync:push'), {
            'device_id': self.d1,
            'changes': [{'entity': 'sales', 'entity_uuid': 's1', 'op': 'INSERT', 'seq': 1, 'payload': {}}],
        }, device_id=self.d1)
        self._post(reverse('sync:push'), {
            'device_id': self.d2,
            'changes': [{'entity': 'customers', 'entity_uuid': 'c1', 'op': 'INSERT', 'seq': 1, 'payload': {}}],
        }, device_id=self.d2)

        # d1 incremental after seq1 should see only d2's customer change.
        r = self._get(f"{reverse('sync:pull')}?device={self.d1}&since=1", device_id=self.d1).json()
        ents = [c['entity'] for c in r['changes']]
        self.assertIn('customers', ents)
        self.assertNotIn('sales', ents)

    def test_status_returns_device_state(self):
        self._post(reverse('sync:push'), {
            'device_id': self.d1, 'changes': [{'entity': 'items', 'entity_uuid': 'i', 'op': 'INSERT', 'seq': 1, 'payload': {}}],
        }, device_id=self.d1)
        r = self._get(f"{reverse('sync:status')}?device={self.d1}", device_id=self.d1).json()
        self.assertEqual(r['status'], 'active')
        self.assertFalse(r['blocked'])

    def test_disabled_device_is_refused(self):
        self._post(reverse('sync:push'), {
            'device_id': self.d2, 'changes': [{'entity': 'items', 'entity_uuid': 'i', 'op': 'INSERT', 'seq': 1, 'payload': {}}],
        }, device_id=self.d2)
        SyncDevice.objects.filter(device_id=self.d2).update(status='disabled')
        r = self._post(reverse('sync:push'), {
            'device_id': self.d2, 'changes': [{'entity': 'items', 'entity_uuid': 'x', 'op': 'INSERT', 'seq': 2, 'payload': {}}],
        }, device_id=self.d2)
        self.assertIn(r.status_code, (401, 403))

    def test_unauthenticated_is_refused(self):
        r = self.client.post(reverse('sync:push'), data=json.dumps({'device_id': 'ghost', 'changes': []}),
                             content_type='application/json')
        self.assertIn(r.status_code, (401, 403))

    def test_invalid_device_id_rejected(self):
        # A device_id with control characters / whitespace is rejected rather
        # than stored/reflected (Appendix J input validation). In JWT mode the
        # identity comes from the X-Device-Id header, so the bad value is there.
        r = self._post(reverse('sync:push'), {
            'changes': [],
        }, device_id='bad id <script>')
        self.assertEqual(r.status_code, 400)

    def test_invalid_op_rejected(self):
        r = self._post(reverse('sync:push'), {
            'device_id': self.d1,
            'changes': [{'entity': 'items', 'entity_uuid': 'x', 'op': 'DROP TABLE', 'seq': 1, 'payload': {}}],
        }, device_id=self.d1)
        self.assertEqual(r.status_code, 400)

    def test_oversized_payload_rejected(self):
        big = {'pad': 'x' * (64 * 1024)}
        r = self._post(reverse('sync:push'), {
            'device_id': self.d1,
            'changes': [{'entity': 'items', 'entity_uuid': 'x', 'op': 'INSERT', 'seq': 1, 'payload': big}],
        }, device_id=self.d1)
        self.assertEqual(r.status_code, 400)

    def test_license_device_capacity_enforced(self):
        # A Pro plan with device_limit=5 refuses a 6th auto-registered device.
        for i in range(5):
            did = f'cap-device-{i}'
            r = self._post(reverse('sync:push'), {
                'device_id': did, 'changes': [],
            }, device_id=did)
            self.assertEqual(r.status_code, 200)
        r = self._post(reverse('sync:push'), {
            'device_id': 'cap-device-5', 'changes': [],
        }, device_id='cap-device-5')
        self.assertIn(r.status_code, (400, 403))
        self.assertEqual(SyncDevice.objects.filter(business=self.owner, is_active=True).count(), 5)

    def test_device_key_mode(self):
        self._post(reverse('sync:push'), {
            'device_id': self.d1, 'changes': [{'entity': 'items', 'entity_uuid': 'i', 'op': 'INSERT', 'seq': 1, 'payload': {}}],
        }, device_id=self.d1)
        SyncDevice.objects.filter(device_id=self.d1).update(secret_hash=hash_device_key('desktop-secret-1'))
        r = self._post(reverse('sync:push'), {'device_id': self.d1, 'changes': []}, key='desktop-secret-1')
        self.assertEqual(r.status_code, 200)
        r_bad = self._post(reverse('sync:push'), {'device_id': self.d1, 'changes': []}, key='wrong')
        self.assertIn(r_bad.status_code, (401, 403))

    def test_removed_device_auto_does_not_sync_arbitrary_business(self):
        # Tenant isolation: a JWT of business A cannot read business B's change.
        other = User.objects.create_user(username='otherbiz', email='other@x.com', password='pw')
        other.is_customer = True
        other.save()
        plan = LicensePlan.objects.create(name='Basic', duration_months=12, device_limit=2, price='20.00')
        License.objects.create(customer=other, plan=plan, start_date=date(2026, 1, 1),
                               expiry_date=date(2027, 1, 1), device_limit=2)
        refresh2 = RefreshToken.for_user(other)
        h2 = {'HTTP_AUTHORIZATION': f'Bearer {str(refresh2.access_token)}', 'HTTP_X_DEVICE_ID': 'other-dev'}

        self._post(reverse('sync:push'), {
            'device_id': self.d1, 'changes': [{'entity': 'customers', 'entity_uuid': 'secret-c', 'op': 'INSERT', 'seq': 1, 'payload': {'name': 'SECRET'}}],
        }, device_id=self.d1)

        r = self.client.get(f"{reverse('sync:pull')}?device=other-dev&since=0", **h2).json()
        ents = [c['entity_uuid'] for c in r['changes']]
        self.assertNotIn('secret-c', ents)


class AuditChainVerificationTests(TestCase):
    """§32 backend audit-chain verification (root-of-trust anchors)."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='chainowner', email='chainowner@x.com', password='pw12345'
        )
        self.owner.is_customer = True
        self.owner.business_name = 'Chain Biz'
        self.owner.save()
        plan = LicensePlan.objects.create(name='Pro', duration_months=12, device_limit=5, price='50.00')
        self.license = License.objects.create(
            customer=self.owner, plan=plan,
            start_date=date(2026, 1, 1), expiry_date=date(2027, 1, 1), device_limit=5,
        )
        refresh = RefreshToken.for_user(self.owner)
        self.access = str(refresh.access_token)
        self.d1 = 'chain-device-uuid'

        self.admin = User.objects.create_user(username='rootadmin', email='root@x.com', password='pw')
        self.admin.is_admin = True
        self.admin.is_staff = True
        self.admin.save()
        self.admin_access = f'Bearer {str(RefreshToken.for_user(self.admin).access_token)}'

        self._register_device()

    def _register_device(self):
        self.client.post(reverse('sync:push'), data=json.dumps({
            'device_id': self.d1, 'changes': [],
        }), content_type='application/json',
            **{'HTTP_AUTHORIZATION': f'Bearer {self.access}', 'HTTP_X_DEVICE_ID': self.d1})

    def _post(self, path, data, device_id=None, key=None):
        headers = {'HTTP_AUTHORIZATION': f'Bearer {self.access}', 'HTTP_X_DEVICE_ID': device_id or self.d1}
        return self.client.post(path, data=json.dumps(data), content_type='application/json', **headers)

    def _commit_url(self):
        return reverse('sync:audit-chain-commit')

    def verify_url(self, business_id=None):
        return reverse('sync:audit-chain-verify', args=[business_id or self.owner.id])

    # ── service-level ─────────────────────────────────────────────────────

    def test_valid_chain_verifies_ok(self):
        records, head = _chain(5)
        result = submit_audit_chain(self.owner, SyncDevice.objects.get(device_id=self.d1), 5, head, records)
        check = result['verification']
        self.assertTrue(check['ok'])
        self.assertEqual(check['count'], 5)
        v = verify_business_audit_chain(self.owner.id)
        self.assertTrue(v['exists'])
        self.assertTrue(v['ok'])
        self.assertEqual(v['broken_at'], None)

    def test_modified_data_breaks_chain(self):
        records, head = _chain(5)
        records[2]['hash'] = hashlib.sha256('tampered'.encode()).hexdigest()
        result = submit_audit_chain(self.owner, SyncDevice.objects.get(device_id=self.d1), 5, head, records)
        check = result['verification']
        self.assertFalse(check['ok'])
        # The break is detected at the record following the tampered one.
        self.assertEqual(check['broken_at'], records[3]['seq'])
        self.assertFalse(verify_business_audit_chain(self.owner.id)['ok'])

    def test_broken_prev_hash_reported(self):
        records, head = _chain(5)
        records[3]['prev_hash'] = 'WRONG'
        result = submit_audit_chain(self.owner, SyncDevice.objects.get(device_id=self.d1), 5, head, records)
        check = result['verification']
        self.assertFalse(check['ok'])
        self.assertEqual(check['broken_at'], records[3]['seq'])

    def test_missing_record_breaks_chain(self):
        # Record 3's prev_hash no longer matches record 2's hash → missing/inserted link.
        records, _ = _chain(5)
        records[2]['prev_hash'] = 'X'
        result = submit_audit_chain(self.owner, SyncDevice.objects.get(device_id=self.d1), 5, records[-1]['hash'], records)
        check = result['verification']
        self.assertFalse(check['ok'])
        self.assertEqual(check['broken_at'], records[2]['seq'])

    def test_forged_head_hash_detected(self):
        records, _ = _chain(5)
        result = submit_audit_chain(self.owner, SyncDevice.objects.get(device_id=self.d1), 5, 'deadbeef' * 8, records)
        check = result['verification']
        self.assertFalse(check['ok'])
        self.assertFalse(check['head_match'])
        # The chain itself is continuous but the committed head does not match.
        self.assertEqual(check['broken_at'], None)
        self.assertTrue(check['count_match'])

    def test_count_mismatch_detected(self):
        records, head = _chain(5)
        result = submit_audit_chain(self.owner, SyncDevice.objects.get(device_id=self.d1), 7, head, records)
        check = result['verification']
        self.assertFalse(check['ok'])
        self.assertFalse(check['count_match'])

    def test_empty_chain(self):
        result = submit_audit_chain(self.owner, SyncDevice.objects.get(device_id=self.d1), 0, AUDIT_GENESIS, [])
        check = result['verification']
        self.assertTrue(check['ok'])
        v = verify_business_audit_chain(self.owner.id)
        self.assertTrue(v['ok'])

    def test_no_commit_reports_missing(self):
        v = verify_business_audit_chain(self.owner.id)
        self.assertFalse(v['exists'])
        self.assertFalse(v['ok'])

    def test_wrong_business_not_visible(self):
        records, head = _chain(3)
        submit_audit_chain(self.owner, SyncDevice.objects.get(device_id=self.d1), 3, head, records)
        other = User.objects.create_user(username='otherchain', email='oc@x.com', password='pw')
        other.is_customer = True
        other.save()
        v = verify_business_audit_chain(other.id)
        self.assertFalse(v['exists'])
        self.assertNotEqual(v.get('count'), 3)

    # ── API (sync commit) ─────────────────────────────────────────────────

    def test_commit_endpoint_stores_and_verifies(self):
        records, head = _chain(6)
        r = self._post(self._commit_url(), {
            'device_id': self.d1,
            'record_count': 6,
            'head_hash': head,
            'records': records,
        })
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['verification']['ok'])
        self.assertTrue(AuditChainCommit.objects.filter(business=self.owner).exists())

    def test_commit_endpoint_rejects_bad_input(self):
        r = self._post(self._commit_url(), {'device_id': self.d1, 'record_count': 'x', 'head_hash': 'h', 'records': []})
        self.assertEqual(r.status_code, 400)
        r = self._post(self._commit_url(), {'device_id': self.d1, 'record_count': 1, 'head_hash': '', 'records': []})
        self.assertEqual(r.status_code, 400)
        r = self._post(self._commit_url(), {'device_id': self.d1, 'record_count': 1, 'head_hash': 'h', 'records': 'nope'})
        self.assertEqual(r.status_code, 400)

    def test_commit_requires_auth(self):
        records, head = _chain(2)
        r = self.client.post(self._commit_url(), data=json.dumps({
            'device_id': self.d1, 'record_count': 2, 'head_hash': head, 'records': records}),
            content_type='application/json')
        self.assertIn(r.status_code, (401, 403))

    # ── API (admin verify) ────────────────────────────────────────────────

    def test_admin_verify_endpoint_ok(self):
        records, head = _chain(8)
        self._post(self._commit_url(), {'device_id': self.d1, 'record_count': 8, 'head_hash': head, 'records': records})
        r = self.client.get(self.verify_url(), **{'HTTP_AUTHORIZATION': self.admin_access})
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['ok'])
        self.assertEqual(r.json()['count'], 8)

    def test_admin_verify_reports_break(self):
        records, head = _chain(8)
        records[5]['hash'] = hashlib.sha256('fake'.encode()).hexdigest()
        self._post(self._commit_url(), {'device_id': self.d1, 'record_count': 8, 'head_hash': head, 'records': records})
        r = self.client.get(self.verify_url(), **{'HTTP_AUTHORIZATION': self.admin_access})
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()['ok'])
        # Break is detected at the record following the tampered one (seq 7).
        self.assertEqual(r.json()['broken_at'], records[6]['seq'])

    def test_admin_endpoint_denies_non_admin(self):
        records, head = _chain(2)
        self._post(self._commit_url(), {'device_id': self.d1, 'record_count': 2, 'head_hash': head, 'records': records})
        # The business owner is not an admin.
        r = self.client.get(self.verify_url(),
                            **{'HTTP_AUTHORIZATION': f'Bearer {self.access}', 'HTTP_X_DEVICE_ID': self.d1})
        self.assertIn(r.status_code, (401, 403))

    # ── chain_from_sync_records seed helper ───────────────────────────────

    def test_chain_from_sync_records(self):
        for seq in (1, 2, 3):
            self._post(reverse('sync:push'), {
                'device_id': self.d1,
                'changes': [{
                    'entity': 'audit', 'entity_uuid': f'audit-{seq}', 'op': 'INSERT',
                    'seq': seq, 'payload': {}, 'checksum': hashlib.sha256(f'audit-{seq}'.encode()).hexdigest(),
                }],
            })
        records, count, head = chain_from_sync_records(self.owner.id)
        self.assertEqual(count, 3)
        self.assertEqual(records[0]['prev_hash'], AUDIT_GENESIS)
        self.assertEqual(records[-1]['hash'], head)
