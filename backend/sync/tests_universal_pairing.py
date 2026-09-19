"""Universal Owner/Employee invitation + device-pairing tests.

Covers the cross-platform pairing contract: Desktop and Mobile are equal
platforms, so an invitation is platform-agnostic; the 6-digit manual code works
identically to the QR token; device capacity is enforced at accept/approve; the
pairing record reaches terminal approved/rejected/cancelled states; and the
owner can manage (rename/revoke) roster devices without touching the bound user
or their other devices.
"""

import json
from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User, BusinessMembership
from licenses.models import LicensePlan, License

from .models import SyncDevice, PairingInvitation


class UniversalPairingTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='univowner', email='univowner@x.com', password='pw12345'
        )
        self.owner.is_customer = True
        self.owner.business_name = 'Universal Biz'
        self.owner.save()
        self.manager = User.objects.create_user(
            username='univmgr', email='univmgr@x.com', password='pw12345'
        )
        BusinessMembership.objects.create(user=self.manager, business=self.owner, role='manager')
        self.cashier = User.objects.create_user(
            username='univcash', email='univcash@x.com', password='pw12345'
        )
        self.cashier2 = User.objects.create_user(
            username='univcash2', email='univcash2@x.com', password='pw12345'
        )
        plan = LicensePlan.objects.create(name='Univ', duration_months=12, device_limit=2, price='50.00')
        self.license = License.objects.create(
            customer=self.owner, plan=plan,
            start_date=date(2026, 1, 1), expiry_date=date(2027, 1, 1), device_limit=2,
        )
        self.owner.licenses.add(self.license)

    def _auth(self, user):
        return {'HTTP_AUTHORIZATION': f'Bearer {RefreshToken.for_user(user).access_token}'}

    def _post(self, name, data, user=None, args=None):
        return self.client.post(
            reverse(name, args=args or []),
            data=json.dumps(data),
            content_type='application/json',
            **self._auth(user) if user else {},
        )

    def _invite(self, user=None, platform='desktop', **overrides):
        body = {'employee_name': 'Hana', 'role': 'cashier', 'platform': platform}
        body.update(overrides)
        return self._post('sync:pairing-invite', body, user=user or self.owner)

    # ── platform-neutral issuing ─────────────────────────────────────────

    def test_mobile_owner_issues_desktop_invite(self):
        # A MOBILE owner (is_customer) can invite — platform never restricts the
        # inviter or the joining device type.
        r = self._invite(platform='desktop')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['platform'], 'desktop')
        self.assertTrue(r.json()['code'].isdigit() and len(r.json()['code']) == 6)
        self.assertNotEqual(r.json()['token'], r.json()['code'])

    def test_manager_can_invite_for_any_platform(self):
        r = self._invite(user=self.manager, platform='mobile')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['platform'], 'mobile')

    # ── 6-digit manual code === token ────────────────────────────────────

    def test_accept_returns_one_time_device_key(self):
        inv = PairingInvitation.objects.get(pk=self._invite().json()['id'])
        r = self._post('sync:pairing-accept', {'code': inv.code, 'device_id': 'dk-1', 'platform': 'desktop'}, user=self.cashier)
        self.assertEqual(r.status_code, 202)
        key = r.json().get('device_key')
        self.assertTrue(key and len(key) > 20)
        dev = SyncDevice.objects.get(device_id='dk-1', business=self.owner)
        self.assertTrue(dev.secret_hash)

    def test_device_key_not_rotated_on_reaccept_same_device(self):
        # A second accept by the SAME device id (pending re-issue) must not mint a
        # fresh key — the first key stays valid so the joiner keeps syncing.
        inv = PairingInvitation.objects.get(pk=self._invite().json()['id'])
        r1 = self._post('sync:pairing-accept', {'code': inv.code, 'device_id': 'dkr-1'}, user=self.cashier)
        first = r1.json().get('device_key')
        dev = SyncDevice.objects.get(device_id='dkr-1', business=self.owner)
        hash_before = dev.secret_hash
        inv2 = PairingInvitation.objects.get(pk=self._invite().json()['id'])
        r2 = self._post('sync:pairing-accept', {'code': inv2.code, 'device_id': 'dkr-1'}, user=self.cashier2)
        self.assertEqual(r2.status_code, 202)
        self.assertIsNone(r2.json().get('device_key'))
        dev.refresh_from_db()
        self.assertEqual(dev.secret_hash, hash_before)
        self.assertTrue(first)

    def test_lookup_by_code_matches_lookup_by_token(self):
        token = self._invite().json()['token']
        invite = PairingInvitation.objects.get()
        self.assertTrue(invite.code)
        by_token = self._post('sync:pairing-lookup', {'token': token})
        by_code = self._post('sync:pairing-lookup', {'code': invite.code})
        self.assertEqual(by_token.status_code, 200)
        self.assertEqual(by_code.status_code, 200)
        self.assertEqual(by_code.json()['business_name'], by_token.json()['business_name'])
        self.assertEqual(by_code.json()['role'], 'cashier')

    def test_accept_by_code__binds_desktop_device_to_user(self):
        invite = PairingInvitation.objects.get(pk=self._invite(platform='desktop').json()['id'])
        r = self._post('sync:pairing-accept',
                       {'code': invite.code, 'device_id': 'desk-1', 'device_name': 'Reg Desktop', 'platform': 'desktop'},
                       user=self.cashier)
        self.assertEqual(r.status_code, 202)
        dev = SyncDevice.objects.get(business=self.owner, device_id='desk-1')
        self.assertEqual(dev.platform, 'desktop')
        self.assertEqual(dev.status, 'pending')
        self.assertEqual(dev.user_id, self.cashier.id)
        invite.refresh_from_db()
        self.assertEqual(invite.status, 'used')
        self.assertEqual(invite.used_by_id, self.cashier.id)

    def test_code_is_single_use__second_accept_fails(self):
        invite = PairingInvitation.objects.get(pk=self._invite().json()['id'])
        r1 = self._post('sync:pairing-accept', {'code': invite.code, 'device_id': 'd1'}, user=self.cashier)
        self.assertEqual(r1.status_code, 202)
        r2 = self._post('sync:pairing-accept', {'code': invite.code, 'device_id': 'd2'}, user=self.cashier2)
        self.assertEqual(r2.status_code, 400)
        self.assertEqual(r2.json()['reason'], 'used')

    # ── terminal states ─────────────────────────────────────────────────

    def test_approved_state_after_approve(self):
        inv = PairingInvitation.objects.get(pk=self._invite().json()['id'])
        self._post('sync:pairing-accept', {'code': inv.code, 'device_id': 'da'}, user=self.cashier)
        r = self._post('sync:pairing-decision', {}, user=self.owner, args=[inv.pk, 'approve'])
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['status'], 'approved')
        inv.refresh_from_db()
        self.assertEqual(inv.status, 'approved')
        self.assertEqual(inv.device.status, 'active')

    def test_rejected_state_after_reject(self):
        inv = PairingInvitation.objects.get(pk=self._invite().json()['id'])
        self._post('sync:pairing-accept', {'code': inv.code, 'device_id': 'dr'}, user=self.cashier)
        r = self._post('sync:pairing-decision', {}, user=self.owner, args=[inv.pk, 'reject'])
        self.assertEqual(r.status_code, 200)
        inv.refresh_from_db()
        self.assertEqual(inv.status, 'rejected')
        self.assertEqual(inv.device.status, 'disabled')

    def test_cancelled_state_after_revoke(self):
        inv = PairingInvitation.objects.get(pk=self._invite().json()['id'])
        r = self._post('sync:pairing-revoke', {}, user=self.owner, args=[inv.pk])
        self.assertEqual(r.status_code, 200)
        inv.refresh_from_db()
        self.assertEqual(inv.status, 'cancelled')

    def test_lookup_forwards_terminal_states(self):
        inv = PairingInvitation.objects.get(pk=self._invite().json()['id'])
        code = inv.code
        self._post('sync:pairing-accept', {'code': code, 'device_id': 'dt'}, user=self.cashier)
        self._post('sync:pairing-decision', {}, user=self.owner, args=[inv.pk, 'approve'])
        r = self._post('sync:pairing-lookup', {'code': code})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['reason'], 'approved')

    # ── subscription / device capacity on pairing ───────────────────────

    def test_accept_denied_when_business_at_device_limit(self):
        # device_limit=2; two active devices means capacity is full.
        SyncDevice.objects.create(business=self.owner, license=self.license,
                                  device_id='full-1', device_name='Full A', status='active', is_active=True)
        SyncDevice.objects.create(business=self.owner, license=self.license,
                                  device_id='full-2', device_name='Full B', status='active', is_active=True)
        inv = PairingInvitation.objects.get(pk=self._invite().json()['id'])
        r = self._post('sync:pairing-accept', {'code': inv.code, 'device_id': 'over-1'}, user=self.cashier)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['reason'], 'device_limit')

    def test_approve_denied_when_capacity_shrunk(self):
        inv = PairingInvitation.objects.get(pk=self._invite().json()['id'])
        self._post('sync:pairing-accept', {'code': inv.code, 'device_id': 'cap-1'}, user=self.cashier)
        # capacity shrinks to 0 (unlimited is 0, so use -1 impossible; set limit 0).
        self.license.device_limit = 1
        self.license.save()
        # one pending device does not count active, so another active arrives first:
        SyncDevice.objects.create(business=self.owner, license=self.license,
                                  device_id='cap-2', status='active', is_active=True)
        r = self._post('sync:pairing-decision', {}, user=self.owner, args=[inv.pk, 'approve'])
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['reason'], 'device_limit')

    # ── device management (roster list + revoke) ────────────────────────

    def test_device_list_requires_owner_or_team_manage(self):
        r = self.client.get(reverse('sync:device-list'), **self._auth(self.cashier))
        self.assertEqual(r.status_code, 403)

    def _approved_device(self, user, device_id):
        inv = PairingInvitation.objects.get(pk=self._invite().json()['id'])
        self._post('sync:pairing-accept', {'code': inv.code, 'device_id': device_id}, user=user)
        self._post('sync:pairing-decision', {}, user=self.owner, args=[inv.pk, 'approve'])
        return SyncDevice.objects.get(device_id=device_id, business=self.owner)

    def test_device_list_shows_bound_user_and_platform(self):
        self._approved_device(self.cashier, 'mg-1')
        r = self.client.get(reverse('sync:device-list'), **self._auth(self.owner))
        self.assertEqual(r.status_code, 200)
        devs = r.json()['devices']
        self.assertEqual(len(devs), 1)
        self.assertEqual(devs[0]['device_id'], 'mg-1')
        self.assertEqual(devs[0]['bound_user_id'], self.cashier.id)
        self.assertEqual(devs[0]['bound_user_name'], self.cashier.username)

    def test_revoke_one_device_keeps_user_and_other_device(self):
        d1 = self._approved_device(self.cashier, 'rv-1')
        d2 = self._approved_device(self.cashier, 'rv-2')
        # Revoke device 1 via PATCH status and via DELETE; user + device 2 remain.
        r = self.client.patch(reverse('sync:device-manage', args=[d1.pk]),
                              data=json.dumps({'status': 'disabled'}),
                              content_type='application/json',
                              **self._auth(self.owner))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['status'], 'disabled')
        r = self.client.delete(reverse('sync:device-manage', args=[d2.pk]), **self._auth(self.owner))
        self.assertEqual(r.status_code, 200)
        d1.refresh_from_db(); d2.refresh_from_db()
        self.assertEqual(d1.status, 'disabled')
        self.assertEqual(d2.status, 'removed')
        # The SAME person's membership + other device stay intact.
        self.assertEqual(d1.user_id, self.cashier.id)
        self.assertEqual(d2.user_id, self.cashier.id)
        ms = BusinessMembership.objects.get(user=self.cashier, business=self.owner)
        self.assertEqual(ms.status, 'active')

    def test_rename_device(self):
        dev = self._approved_device(self.cashier, 'rn-1')
        r = self.client.patch(reverse('sync:device-manage', args=[dev.pk]),
                              data=json.dumps({'device_name': 'Back Office Desktop'}),
                              content_type='application/json',
                              **self._auth(self.owner))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['device_name'], 'Back Office Desktop')

    def test_invalid_status_rejected(self):
        dev = self._approved_device(self.cashier, 'st-1')
        r = self.client.patch(reverse('sync:device-manage', args=[dev.pk]),
                              data=json.dumps({'status': 'pending'}),
                              content_type='application/json',
                              **self._auth(self.owner))
        self.assertEqual(r.status_code, 400)

    def test_reactivate_within_capacity(self):
        dev = self._approved_device(self.cashier, 're-1')
        r1 = self.client.patch(reverse('sync:device-manage', args=[dev.pk]),
                               data=json.dumps({'status': 'locked'}),
                               content_type='application/json',
                               **self._auth(self.owner))
        self.assertEqual(r1.status_code, 200)
        r2 = self.client.patch(reverse('sync:device-manage', args=[dev.pk]),
                               data=json.dumps({'status': 'active'}),
                               content_type='application/json',
                               **self._auth(self.owner))
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.json()['status'], 'active')

    # ── resumable pairing requests (mine) ───────────────────────────────

    def _mine(self, user):
        return self.client.get(reverse('sync:pairing-mine'), **self._auth(user))

    def test_mine_empty_before_any_accept(self):
        r = self._mine(self.cashier)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['pairing_requests'], [])

    def test_mine_shows_my_accepted_request_as_resumable(self):
        inv = PairingInvitation.objects.get(pk=self._invite().json()['id'])
        self._post('sync:pairing-accept', {'code': inv.code, 'device_id': 'my-1', 'device_name': 'Resume Reg', 'platform': 'desktop'},
                   user=self.cashier)
        r = self._mine(self.cashier)
        self.assertEqual(r.status_code, 200)
        items = r.json()['pairing_requests']
        self.assertEqual(len(items), 1)
        it = items[0]
        self.assertEqual(it['id'], inv.pk)
        # Accept leaves the request waiting (used + device still pending) —
        # exactly the state the joiner must be able to resume into.
        self.assertEqual(it['status'], 'used')
        self.assertEqual(it['device_status'], 'pending')
        self.assertEqual(it['business_name'], 'Universal Biz')
        self.assertEqual(it['role'], 'cashier')
        self.assertEqual(it['device_name'], 'Resume Reg')
        self.assertEqual(it['platform'], 'desktop')
        self.assertTrue(it['resumable'])
        self.assertFalse(it['expired'])

    def test_mine_does_not_leak_other_users_requests(self):
        inv = PairingInvitation.objects.get(pk=self._invite().json()['id'])
        self._post('sync:pairing-accept', {'code': inv.code, 'device_id': 'leak-1'}, user=self.cashier)
        # The owner issued it but never accepted it; a third user never saw it.
        self.assertEqual(self._mine(self.owner).json()['pairing_requests'], [])
        self.assertEqual(self._mine(self.cashier2).json()['pairing_requests'], [])
        self.assertEqual(len(self._mine(self.cashier).json()['pairing_requests']), 1)

    def test_mine_reflects_approval_and_rejection(self):
        inv = PairingInvitation.objects.get(pk=self._invite().json()['id'])
        self._post('sync:pairing-accept', {'code': inv.code, 'device_id': 'dec-1'}, user=self.cashier)
        self._post('sync:pairing-decision', {}, user=self.owner, args=[inv.pk, 'approve'])
        it = self._mine(self.cashier).json()['pairing_requests'][0]
        self.assertEqual(it['status'], 'approved')
        self.assertEqual(it['device_status'], 'active')
        self.assertFalse(it['resumable'])

        inv2 = PairingInvitation.objects.get(pk=self._invite().json()['id'])
        self._post('sync:pairing-accept', {'code': inv2.code, 'device_id': 'dec-2'}, user=self.cashier)
        self._post('sync:pairing-decision', {}, user=self.owner, args=[inv2.pk, 'reject'])
        it = [i for i in self._mine(self.cashier).json()['pairing_requests'] if i['id'] == inv2.pk][0]
        self.assertEqual(it['status'], 'rejected')
        self.assertEqual(it['device_status'], 'disabled')
        self.assertFalse(it['resumable'])

    def test_mine_marks_expired_pending_and_unresumable(self):
        from django.utils import timezone as tz
        inv = PairingInvitation.objects.get(pk=self._invite().json()['id'])
        self._post('sync:pairing-accept', {'code': inv.code, 'device_id': 'exp-1'}, user=self.cashier)
        # The request itself survives; only the short-lived code window's expiry
        # matters for resume eligibility. Making the window lapse must NOT re-issue
        # a code — it just stops the request from resuming.
        PairingInvitation.objects.filter(pk=inv.pk).update(
            expires_at=tz.now() - tz.timedelta(minutes=1)
        )
        it = self._mine(self.cashier).json()['pairing_requests'][0]
        self.assertTrue(it['expired'])
        self.assertFalse(it['resumable'])

    def test_mine_lists_my_requests_newest_first(self):
        inv1 = PairingInvitation.objects.get(pk=self._invite().json()['id'])
        self._post('sync:pairing-accept', {'code': inv1.code, 'device_id': 'ord-1'}, user=self.cashier)
        inv2 = PairingInvitation.objects.get(pk=self._invite().json()['id'])
        self._post('sync:pairing-accept', {'code': inv2.code, 'device_id': 'ord-2'}, user=self.cashier)
        items = self._mine(self.cashier).json()['pairing_requests']
        self.assertEqual([i['device_id'] for i in items], ['ord-2', 'ord-1'])