"""Device -> User / Membership binding tests.

These prove the identity architecture directive: a person is independent from
their device/platform. A single user (owner/cashier/manager) may own a desktop
AND a mobile — both SyncDevice rows point back to the SAME accounts.User and its
BusinessMembership. Roles live on the membership; the device is only a binding
to that membership. Per-device revocation does NOT revoke the user or their
other devices.
"""
import json
from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User, BusinessMembership
from licenses.models import LicensePlan, License
from .models import SyncDevice
from .authorization import hash_device_key


class DeviceUserBindingTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='bindowner', email='bindowner@x.com', password='pw12345'
        )
        self.owner.is_customer = True
        self.owner.business_name = 'Bind Biz'
        self.owner.save()
        plan = LicensePlan.objects.create(name='Pro', duration_months=12, device_limit=10, price='50.00')
        self.license = License.objects.create(
            customer=self.owner, plan=plan,
            start_date=date(2026, 1, 1), expiry_date=date(2027, 1, 1), device_limit=10,
        )
        self.cashier = User.objects.create_user(
            username='bindcashier', email='bindcashier@x.com', password='pw12345'
        )
        self.manager = User.objects.create_user(
            username='bindmanager', email='bindmanager@x.com', password='pw12345'
        )
        self.membership_cashier = BusinessMembership.objects.create(
            user=self.cashier, business=self.owner, role='cashier'
        )
        BusinessMembership.objects.create(
            user=self.manager, business=self.owner, role='manager'
        )

    def _auth(self, user, device_id, key=None):
        if key:
            return {'HTTP_X_DEVICE_KEY': key, 'HTTP_X_DEVICE_ID': device_id}
        return {
            'HTTP_AUTHORIZATION': f'Bearer {RefreshToken.for_user(user).access_token}',
            'HTTP_X_DEVICE_ID': device_id,
        }

    def _push(self, user, device_id, change, key=None):
        return self.client.post(
            reverse('sync:push'),
            data=json.dumps({'device_id': device_id, 'changes': [change]}),
            content_type='application/json',
            **self._auth(user, device_id, key),
        )

    def test_auto_register_binds_same_user_two_devices(self):
        """One person's desktop + mobile are distinct rows bound to the SAME user."""
        change = {
            'entity': 'sales', 'entity_uuid': 'x1', 'op': 'INSERT',
            'payload': {'id': 'x1'}, 'seq': 1,
        }
        r1 = self._push(self.cashier, 'cashier-desktop', change)
        self.assertEqual(r1.status_code, 200)
        r2 = self._push(self.cashier, 'cashier-mobile', change)
        self.assertEqual(r2.status_code, 200)

        desktop = SyncDevice.objects.get(business=self.owner, device_id='cashier-desktop')
        mobile = SyncDevice.objects.get(business=self.owner, device_id='cashier-mobile')
        # BOTH devices belong to the SAME person (no per-device employee identity).
        self.assertEqual(desktop.user_id, self.cashier.id)
        self.assertEqual(mobile.user_id, self.cashier.id)
        self.assertEqual(desktop.role_key, 'cashier')
        self.assertEqual(mobile.role_key, 'cashier')

    def test_role_change_propagates_to_device_mirror_on_next_auth(self):
        """Promote cashier -> manager: both devices get manager on next sync."""
        change = {
            'entity': 'sales', 'entity_uuid': 'y1', 'op': 'INSERT',
            'payload': {'id': 'y1'}, 'seq': 1,
        }
        self._push(self.cashier, 'cashier-desktop', change)
        self._push(self.cashier, 'cashier-mobile', change)

        desktop = SyncDevice.objects.get(business=self.owner, device_id='cashier-desktop')
        self.assertEqual(desktop.role_key, 'cashier')

        # Owner promotes the member.
        self.membership_cashier.role = 'manager'
        self.membership_cashier.save()

        # Next sync refresh both devices' role mirrors from the LIVE membership.
        for dev_id in ('cashier-desktop', 'cashier-mobile'):
            r = self._push(self.cashier, dev_id, change)
            self.assertEqual(r.status_code, 200)
        desktop.refresh_from_db()
        mobile = SyncDevice.objects.get(business=self.owner, device_id='cashier-mobile')
        self.assertEqual(desktop.role_key, 'manager')
        self.assertEqual(mobile.role_key, 'manager')

        # And the transport now authorizes manager-level entities from either device.
        r = self._push(
            self.cashier, 'cashier-desktop',
            {'entity': 'users', 'entity_uuid': 'u1', 'op': 'INSERT',
             'payload': {'id': 'u1'}, 'seq': 2},
        )
        self.assertEqual(r.status_code, 200)

    def test_per_device_revocation_keeps_user_and_other_device(self):
        """Disabling one device does not revoke the person or their other device."""
        change = {
            'entity': 'sales', 'entity_uuid': 'z1', 'op': 'INSERT',
            'payload': {'id': 'z1'}, 'seq': 1,
        }
        self._push(self.cashier, 'cashier-desktop', change)
        self._push(self.cashier, 'cashier-mobile', change)

        desktop = SyncDevice.objects.get(business=self.owner, device_id='cashier-desktop')
        desktop.status = 'disabled'
        desktop.is_active = False
        desktop.save()

        # The member still exists and is active.
        self.membership_cashier.refresh_from_db()
        self.assertTrue(self.membership_cashier.is_active)

        # The OTHER device still syncs fine.
        r = self._push(self.cashier, 'cashier-mobile', change)
        self.assertEqual(r.status_code, 200)

        # The disabled device is refused.
        r2 = self._push(self.cashier, 'cashier-desktop', change)
        self.assertNotEqual(r2.status_code, 200)
        self.assertTrue(SyncDevice.objects.get(
            business=self.owner, device_id='cashier-desktop'
        ).blocked)

    def test_device_key_transport_refreshes_role_from_bound_membership(self):
        """Desktop hub (device-key) role mirror follows the bound member's role."""
        change = {
            'entity': 'sales', 'entity_uuid': 'k1', 'op': 'INSERT',
            'payload': {'id': 'k1'}, 'seq': 1,
        }
        self._push(self.cashier, 'cashier-desktop', change)

        desktop = SyncDevice.objects.get(business=self.owner, device_id='cashier-desktop')
        key = 'test-key-for-bind'
        desktop.secret_hash = hash_device_key(key)
        desktop.save(update_fields=['secret_hash'])

        r = self._push(self.cashier, 'cashier-desktop', change, key=key)
        self.assertEqual(r.status_code, 200)

        # Promote to manager; the device-key path (no JWT) still refreshes.
        self.membership_cashier.role = 'manager'
        self.membership_cashier.save()
        r = self._push(None, 'cashier-desktop', change, key=key)
        self.assertEqual(r.status_code, 200)
        desktop.refresh_from_db()
        self.assertEqual(desktop.role_key, 'manager')

    def test_pairing_accept_binds_device_to_joining_user(self):
        """Employee accepting an invitation gets their device bound to their account."""
        hana = User.objects.create_user(
            username='bindhana', email='bindhana@x.com', password='pw12345'
        )
        resp = self.client.post(
            reverse('sync:pairing-invite'),
            data=json.dumps({'employee_name': 'Hana', 'role': 'cashier'}),
            content_type='application/json',
            **self._auth(self.owner, 'owner-device'),
        )
        self.assertEqual(resp.status_code, 201)
        token = resp.json()['token']

        r = self.client.post(
            reverse('sync:pairing-accept'),
            data=json.dumps({
                'token': token, 'device_id': 'hana-mobile',
                'device_name': 'Hana Phone', 'platform': 'mobile',
            }),
            content_type='application/json',
            **self._auth(hana, 'hana-mobile'),
        )
        self.assertEqual(r.status_code, 202)
        device = SyncDevice.objects.get(business=self.owner, device_id='hana-mobile')
        self.assertEqual(device.user_id, hana.id)
        self.assertEqual(device.role_key, 'cashier')

    def test_device_status_reports_bound_user(self):
        """The roster status endpoint exposes which person owns a device."""
        change = {
            'entity': 'sales', 'entity_uuid': 's1', 'op': 'INSERT',
            'payload': {'id': 's1'}, 'seq': 1,
        }
        self._push(self.cashier, 'cashier-mobile', change)

        r = self.client.get(
            reverse('sync:device-status'),
            {'target': 'cashier-mobile'},
            **self._auth(self.owner, 'owner-device'),
        )
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body['bound_user_id'], self.cashier.id)
        self.assertEqual(body['bound_user_name'], self.cashier.username)