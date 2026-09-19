import json
from datetime import date, timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User, BusinessMembership
from licenses.models import LicensePlan, License

from .models import SyncDevice, PairingInvitation
from .security import hash_pairing_token


class PairingFlowTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='pairowner', email='pairowner@x.com', password='pw12345'
        )
        self.owner.is_customer = True
        self.owner.business_name = 'Pair Biz'
        self.owner.save()
        self.manager = User.objects.create_user(
            username='pairmgr', email='pairmgr@x.com', password='pw12345'
        )
        BusinessMembership.objects.create(user=self.manager, business=self.owner, role='manager')
        self.cashier = User.objects.create_user(
            username='pairseller', email='pairseller@x.com', password='pw12345'
        )
        plan = LicensePlan.objects.create(name='Pro', duration_months=12, device_limit=5, price='50.00')
        self.license = License.objects.create(
            customer=self.owner, plan=plan,
            start_date=date(2026, 1, 1), expiry_date=date(2027, 1, 1), device_limit=5,
        )

    def _auth(self, user):
        return {'HTTP_AUTHORIZATION': f'Bearer {RefreshToken.for_user(user).access_token}'}

    def _post(self, name, data, user=None, args=None):
        return self.client.post(
            reverse(name, args=args or []),
            data=json.dumps(data),
            content_type='application/json',
            **self._auth(user) if user else {},
        )

    def _invite(self, user=None, **overrides):
        body = {'employee_name': 'Abebe Kebede', 'role': 'cashier',
                'register': 'Register 1', 'location': 'Main Store'}
        body.update(overrides)
        return self._post('sync:pairing-invite', body, user=user or self.owner)

    # ── issue ────────────────────────────────────────────────────────────

    def test_owner_issues_invitation_with_token(self):
        r = self._invite()
        self.assertEqual(r.status_code, 201)
        data = r.json()
        self.assertTrue(data['token'])
        self.assertEqual(data['role'], 'cashier')
        self.assertIn('shega://join?t=', data['qr_uri'])
        inv = PairingInvitation.objects.get(pk=data['id'])
        self.assertNotEqual(inv.token_hash, data['token'])  # only hash stored
        self.assertFalse(inv.expired)

    def test_manager_with_team_manage_can_issue(self):
        r = self._invite(self.manager)
        self.assertEqual(r.status_code, 201)

    def test_cashier_cannot_issue(self):
        BusinessMembership.objects.create(
            user=self.cashier, business=self.owner, role='cashier'
        )
        r = self._invite(self.cashier)
        self.assertEqual(r.status_code, 403)

    def test_role_escalation_rejected(self):
        r = self._post('sync:pairing-invite',
                       {'employee_name': 'x', 'role': 'owner'}, user=self.owner)
        self.assertEqual(r.status_code, 400)

    # ── lookup ───────────────────────────────────────────────────────────

    def test_lookup_previews_assignment_without_consuming(self):
        token = self._invite().json()['token']
        r = self._post('sync:pairing-lookup', {'token': token})
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data['business_name'], 'Pair Biz')
        self.assertEqual(data['role'], 'cashier')
        self.assertEqual(data['register'], 'Register 1')
        inv = PairingInvitation.objects.get()  # single invitation
        self.assertEqual(inv.status, 'pending')  # not consumed by lookup

    def test_lookup_unknown_token_404(self):
        r = self._post('sync:pairing-lookup', {'token': 'not-a-real-token'})
        self.assertEqual(r.status_code, 404)

    def test_lookup_wrong_role_never_trusted(self):
        # A guess that merely knows the business cannot mint a role.
        r = self._post('sync:pairing-lookup', {'token': 'x'.ljust(43, 'q')})
        self.assertEqual(r.status_code, 404)

    # ── accept ───────────────────────────────────────────────────────────

    def test_accept_creates_pending_device_and_membership(self):
        token = self._invite().json()['token']
        r = self._post('sync:pairing-accept',
                       {'token': token, 'device_id': 'emp-device-1', 'device_name': 'Register 1 POS'},
                       user=self.cashier)
        self.assertEqual(r.status_code, 202)
        self.assertEqual(r.json()['status'], 'pending')
        dev = SyncDevice.objects.get(business=self.owner, device_id='emp-device-1')
        self.assertEqual(dev.status, 'pending')
        self.assertFalse(dev.is_active)
        self.assertEqual(dev.role_key, 'cashier')
        ms = BusinessMembership.objects.get(user=self.cashier, business=self.owner)
        self.assertEqual(ms.status, 'pending')
        self.assertFalse(ms.is_active)
        self.assertEqual(ms.role, 'cashier')  # authoritative from invitation
        inv = PairingInvitation.objects.get()
        self.assertEqual(inv.status, 'used')
        self.assertEqual(inv.used_by, self.cashier)

    def test_pending_membership_cannot_sync_until_approval(self):
        token = self._invite().json()['token']
        self._post('sync:pairing-accept',
                   {'token': token, 'device_id': 'emp-device-1'}, user=self.cashier)
        # Employee pushes from the pending device → refused.
        r = self.client.post(
            reverse('sync:push'),
            data=json.dumps({'device_id': 'emp-device-1', 'changes': [
                {'entity': 'items', 'entity_uuid': 'i1', 'op': 'INSERT', 'seq': 1, 'payload': {}},
            ]}),
            content_type='application/json',
            **self._auth(self.cashier),
        )
        self.assertEqual(r.status_code, 403)

    def test_pending_membership_excluded_from_business_resolution(self):
        token = self._invite().json()['token']
        self._post('sync:pairing-accept',
                   {'token': token, 'device_id': 'emp-device-1'}, user=self.cashier)
        r = self.client.get(reverse('my-memberships'), **self._auth(self.cashier))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['memberships'], [])

    def test_single_use_enforced(self):
        token = self._invite().json()['token']
        self._post('sync:pairing-accept',
                   {'token': token, 'device_id': 'd1'}, user=self.cashier)
        other = User.objects.create_user(username='pairother', email='pairother@x.com', password='pw')
        r = self._post('sync:pairing-accept', {'token': token, 'device_id': 'd2'}, user=other)
        self.assertEqual(r.status_code, 400)
        self.assertIn('already used', r.json()['detail'])

    def test_active_member_can_pair_additional_device(self):
        # Same-user multi-device: an already-active member may join ANOTHER
        # device (desktop+mobile for the same person). Their active membership
        # is left untouched; the new device still waits for owner approval.
        BusinessMembership.objects.create(user=self.cashier, business=self.owner, role='cashier')
        token = self._invite().json()['token']
        r = self._post('sync:pairing-accept',
                       {'token': token, 'device_id': 'd-extra', 'platform': 'desktop'}, user=self.cashier)
        self.assertEqual(r.status_code, 202)
        dev = SyncDevice.objects.get(business=self.owner, device_id='d-extra')
        self.assertEqual(dev.status, 'pending')
        self.assertEqual(dev.platform, 'desktop')
        self.assertEqual(dev.user_id, self.cashier.id)
        ms = BusinessMembership.objects.get(user=self.cashier, business=self.owner)
        self.assertEqual(ms.status, 'active')

    def test_owner_cannot_join_own_business(self):
        token = self._invite().json()['token']
        r = self._post('sync:pairing-accept',
                       {'token': token, 'device_id': 'd1'}, user=self.owner)
        self.assertEqual(r.status_code, 400)

    # ── expiry / revoke ──────────────────────────────────────────────────

    def test_expired_token_fails(self):
        token = self._invite().json()['token']
        PairingInvitation.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
        r = self._post('sync:pairing-lookup', {'token': token})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json().get('reason'), 'expired')
        r2 = self._post('sync:pairing-accept', {'token': token, 'device_id': 'd1'}, user=self.cashier)
        self.assertEqual(r2.status_code, 400)
        self.assertEqual(r2.json().get('reason'), 'expired')

    def test_revoked_token_fails(self):
        token = self._invite().json()['token']
        inv = PairingInvitation.objects.get()
        r = self._post('sync:pairing-revoke', {}, user=self.owner, args=[inv.pk])
        self.assertEqual(r.status_code, 200)
        r = self._post('sync:pairing-lookup', {'token': token})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json().get('reason'), 'cancelled')

    def test_wrong_business_token_stays_scoped(self):
        # A token minted by Business A can never grant membership in Business B:
        # the tenant is derived from the token server-side, never client-supplied.
        other_biz = User.objects.create_user(
            username='pairbiz2', email='pairbiz2@x.com', password='pw'
        )
        other_biz.is_customer = True
        other_biz.save()
        token = self._invite().json()['token']
        r = self._post('sync:pairing-accept', {'token': token, 'device_id': 'd1'}, user=other_biz)
        self.assertEqual(r.status_code, 202)
        # The pending device + membership land on Pair Biz (the invitation's tenant).
        self.assertTrue(SyncDevice.objects.filter(business=self.owner, device_id='d1').exists())
        self.assertFalse(SyncDevice.objects.filter(business=other_biz, device_id='d1').exists())
        self.assertFalse(BusinessMembership.objects.filter(user=other_biz, business=other_biz).exists())

    # ── approve / reject ─────────────────────────────────────────────────

    def _accept(self, user=None, device_id='emp-device-1'):
        token = self._invite().json()['token']
        self._post('sync:pairing-accept', {'token': token, 'device_id': device_id}, user=user or self.cashier)
        return PairingInvitation.objects.get()

    def test_approve_activates_device_and_membership(self):
        inv = self._accept()
        r = self._post('sync:pairing-decision', {}, user=self.owner, args=[inv.pk, 'approve'])
        self.assertEqual(r.status_code, 200)
        dev = SyncDevice.objects.get(device_id='emp-device-1')
        self.assertEqual(dev.status, 'active')
        self.assertTrue(dev.is_active)
        ms = BusinessMembership.objects.get(user=self.cashier, business=self.owner)
        self.assertEqual(ms.status, 'active')
        self.assertTrue(ms.is_active)

    def test_approved_member_can_sync(self):
        inv = self._accept()
        self._post('sync:pairing-decision', {}, user=self.owner, args=[inv.pk, 'approve'])
        r = self.client.post(
            reverse('sync:push'),
            data=json.dumps({'device_id': 'emp-device-1', 'changes': [
                {'entity': 'items', 'entity_uuid': 'i1', 'op': 'INSERT', 'seq': 1, 'payload': {}},
            ]}),
            content_type='application/json',
            **self._auth(self.cashier),
        )
        self.assertEqual(r.status_code, 200)

    def test_manager_can_approve(self):
        inv = self._accept()
        r = self._post('sync:pairing-decision', {}, user=self.manager, args=[inv.pk, 'approve'])
        self.assertEqual(r.status_code, 200)

    def test_cashier_cannot_decide(self):
        bystander = User.objects.create_user(username='pairviewer', email='pairviewer@x.com', password='pw')
        BusinessMembership.objects.create(user=bystander, business=self.owner, role='viewer')
        inv = self._accept()
        r = self._post('sync:pairing-decision', {}, user=bystander, args=[inv.pk, 'approve'])
        self.assertEqual(r.status_code, 403)

    def test_reject_disables_device_and_membership(self):
        inv = self._accept()
        r = self._post('sync:pairing-decision', {}, user=self.owner, args=[inv.pk, 'reject'])
        self.assertEqual(r.status_code, 200)
        dev = SyncDevice.objects.get(device_id='emp-device-1')
        self.assertEqual(dev.status, 'disabled')
        self.assertFalse(dev.is_active)
        ms = BusinessMembership.objects.get(user=self.cashier, business=self.owner)
        self.assertEqual(ms.status, 'disabled')

    def test_decision_requires_accepted_invitation(self):
        inv = self._invite().json()
        inv_obj = PairingInvitation.objects.get(pk=inv['id'])
        r = self._post('sync:pairing-decision', {}, user=self.owner, args=[inv_obj.pk, 'approve'])
        self.assertEqual(r.status_code, 400)
        self.assertIn('nobody has accepted', r.json()['detail'])

    def test_accept_ignores_client_supplied_role(self):
        # A malicious employee sending role=owner in the accept payload gets the
        # invitation's fixed role — never their requested one.
        token = self._invite(role='cashier').json()['token']
        r = self._post('sync:pairing-accept',
                       {'token': token, 'device_id': 'd1', 'role': 'owner', 'permissions': {'team.manage': True}},
                       user=self.cashier)
        self.assertEqual(r.status_code, 202)
        ms = BusinessMembership.objects.get(user=self.cashier, business=self.owner)
        self.assertEqual(ms.role, 'cashier')
        self.assertEqual(ms.permissions, {})
        inv = PairingInvitation.objects.get()
        self.assertEqual(inv.role, 'cashier')

    # ── status (acceptant polling) ───────────────────────────────────────

    def test_acceptant_can_poll_own_status(self):
        inv = self._accept()
        r = self.client.get(reverse('sync:pairing-status', args=[inv.pk]), **self._auth(self.cashier))
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data['status'], 'used')
        self.assertEqual(data['device_status'], 'pending')
        self.assertEqual(data['role'], 'cashier')
        self.assertEqual(data['business_id'], self.owner.id)

    def test_status_reports_active_after_approval(self):
        inv = self._accept()
        self._post('sync:pairing-decision', {}, user=self.owner, args=[inv.pk, 'approve'])
        r = self.client.get(reverse('sync:pairing-status', args=[inv.pk]), **self._auth(self.cashier))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['device_status'], 'active')

    def test_status_denied_to_bystander(self):
        inv = self._accept()
        bystander = User.objects.create_user(username='pairstatus', email='pairstatus@x.com', password='pw')
        r = self.client.get(reverse('sync:pairing-status', args=[inv.pk]), **self._auth(bystander))
        self.assertEqual(r.status_code, 403)

    def test_manager_can_view_status(self):
        inv = self._accept()
        r = self.client.get(reverse('sync:pairing-status', args=[inv.pk]), **self._auth(self.manager))
        self.assertEqual(r.status_code, 200)


class PairingSecurityTests(TestCase):
    """QR tokens: expiry, single-use, revocation, scope, no plaintext storage."""

    def setUp(self):
        self.owner = User.objects.create_user(username='psec', email='psec@x.com', password='pw')
        self.owner.is_customer = True
        self.owner.business_name = 'Sec Biz'
        self.owner.save()
        self.emp = User.objects.create_user(username='psecemp', email='psecemp@x.com', password='pw')
        plan = LicensePlan.objects.create(name='Pro', duration_months=12, device_limit=5, price='50.00')
        License.objects.create(customer=self.owner, plan=plan, start_date=date(2026, 1, 1),
                               expiry_date=date(2027, 1, 1), device_limit=5)

    def _auth(self, user):
        return {'HTTP_AUTHORIZATION': f'Bearer {RefreshToken.for_user(user).access_token}'}

    def _post(self, name, data, user=None):
        return self.client.post(reverse(name), data=json.dumps(data), content_type='application/json',
                                **self._auth(user) if user else {})

    def test_token_not_stored_in_plaintext(self):
        r = self._post('sync:pairing-invite',
                       {'employee_name': 'x', 'role': 'cashier'}, user=self.owner)
        token = r.json()['token']
        inv = PairingInvitation.objects.get()
        self.assertNotEqual(inv.token_hash, token)
        # Seeded hash is stable → an attacker with ONLY the DB cannot mint tokens.
        self.assertEqual(inv.token_hash, hash_pairing_token(token))

    def test_default_expiry_is_short(self):
        r = self._post('sync:pairing-invite',
                       {'employee_name': 'x', 'role': 'cashier'}, user=self.owner)
        inv = PairingInvitation.objects.get()
        lifetime = inv.expires_at - inv.created_at
        self.assertLessEqual(lifetime.total_seconds(), 10 * 60 + 2)
        self.assertGreater(lifetime.total_seconds(), 0)

    def test_expiry_is_explicit_not_dependent_on_transport(self):
        # Expiry is server time; a stale QR (offline relayed) still fails.
        token = self._post('sync:pairing-invite', {'role': 'cashier'}, user=self.owner).json()['token']
        PairingInvitation.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        r = self._post('sync:pairing-accept', {'token': token, 'device_id': 'd1'}, user=self.emp)
        self.assertEqual(r.status_code, 400)