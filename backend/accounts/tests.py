import json
from datetime import date

from django.db import IntegrityError
from django.test import TestCase
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

from licenses.models import License, LicensePlan
from sync.models import SyncRecord

from .models import BusinessMembership, User


class MembershipModelTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner', email='owner@x.com', password='pw12345'
        )
        self.owner.is_customer = True
        self.owner.business_name = 'Owner Biz'
        self.owner.save()
        self.member = User.objects.create_user(
            username='member', email='member@x.com', password='pw12345'
        )

    def test_owner_and_member_relationship(self):
        m = BusinessMembership.objects.create(
            user=self.member, business=self.owner, role='cashier'
        )
        self.assertTrue(self.member.is_member_of(self.owner))
        self.assertFalse(self.member.is_member_of(
            User.objects.create_user(username='other', email='other@x.com', password='x123456')
        ))
        self.assertTrue(self.owner.is_member_of(self.owner))
        self.assertEqual(list(self.member.effective_businesses()), [self.owner])

    def test_duplicate_membership_rejected(self):
        BusinessMembership.objects.create(user=self.member, business=self.owner, role='cashier')
        with self.assertRaises(IntegrityError):
            BusinessMembership.objects.create(user=self.member, business=self.owner, role='manager')

    def test_member_cannot_be_their_own_business(self):
        with self.assertRaises(IntegrityError):
            BusinessMembership.objects.create(user=self.owner, business=self.owner, role='owner')

    def test_owner_cannot_be_added_as_member_by_api(self):
        r = self.client.post(
            reverse('business-members', args=[self.owner.pk]),
            data=json.dumps({'email': self.owner.email, 'role': 'cashier'}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(self.owner).access_token}',
        )
        self.assertEqual(r.status_code, 400)


class MembershipAPITests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner', email='owner@x.com', password='pw12345'
        )
        self.owner.is_customer = True
        self.owner.business_name = 'Owner Biz'
        self.owner.save()
        self.member = User.objects.create_user(
            username='member', email='member@x.com', password='pw12345'
        )
        self.other = User.objects.create_user(
            username='other', email='other@x.com', password='pw12345'
        )
        self.admin = User.objects.create_superuser(
            username='admin', email='admin@x.com', password='pw12345'
        )
        self.membership = BusinessMembership.objects.create(
            user=self.member, business=self.owner, role='cashier'
        )

    def _auth(self, user):
        return {'HTTP_AUTHORIZATION': f'Bearer {RefreshToken.for_user(user).access_token}'}

    def test_owner_adds_member_by_email(self):
        r = self.client.post(
            reverse('business-members', args=[self.owner.pk]),
            data=json.dumps({'email': self.other.email, 'role': 'manager'}),
            content_type='application/json',
            **self._auth(self.owner),
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['role'], 'manager')
        self.assertTrue(self.other.is_member_of(self.owner))

    def test_owner_adds_member_by_phone(self):
        self.other.phone = '0987654321'
        self.other.save()
        r = self.client.post(
            reverse('business-members', args=[self.owner.pk]),
            data=json.dumps({'phone': '0987654321'}),
            content_type='application/json',
            **self._auth(self.owner),
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['role'], 'cashier')

    def test_add_missing_account_returns_404(self):
        r = self.client.post(
            reverse('business-members', args=[self.owner.pk]),
            data=json.dumps({'email': 'nobody@x.com'}),
            content_type='application/json',
            **self._auth(self.owner),
        )
        self.assertEqual(r.status_code, 404)

    def test_non_owner_cannot_manage_memberships(self):
        r = self.client.get(reverse('business-members', args=[self.owner.pk]), **self._auth(self.member))
        self.assertEqual(r.status_code, 403)
        r2 = self.client.post(
            reverse('business-members', args=[self.owner.pk]),
            data=json.dumps({'email': self.other.email}),
            content_type='application/json',
            **self._auth(self.other),
        )
        self.assertEqual(r2.status_code, 403)

    def test_owner_can_list_members(self):
        r = self.client.get(reverse('business-members', args=[self.owner.pk]), **self._auth(self.owner))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()['results']), 1)

    def test_admin_can_manage_memberships(self):
        r = self.client.get(reverse('business-members', args=[self.owner.pk]), **self._auth(self.admin))
        self.assertEqual(r.status_code, 200)
        r2 = self.client.post(
            reverse('business-members', args=[self.owner.pk]),
            data=json.dumps({'email': self.other.email, 'role': 'viewer'}),
            content_type='application/json',
            **self._auth(self.admin),
        )
        self.assertEqual(r2.status_code, 201)

    def test_member_updates_role(self):
        r = self.client.patch(
            reverse('business-membership-detail', args=[self.owner.pk, self.membership.pk]),
            data=json.dumps({'role': 'manager'}),
            content_type='application/json',
            **self._auth(self.owner),
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['role'], 'manager')

    def test_owner_deactivates_and_removes_member(self):
        r = self.client.patch(
            reverse('business-membership-detail', args=[self.owner.pk, self.membership.pk]),
            data=json.dumps({'is_active': False}),
            content_type='application/json',
            **self._auth(self.owner),
        )
        self.assertEqual(r.status_code, 200)
        self.assertFalse(BusinessMembership.objects.get(pk=self.membership.pk).is_active)
        r2 = self.client.delete(
            reverse('business-membership-detail', args=[self.owner.pk, self.membership.pk]),
            **self._auth(self.owner),
        )
        self.assertEqual(r2.status_code, 204)
        self.assertFalse(BusinessMembership.objects.filter(pk=self.membership.pk).exists())

    def test_member_sees_only_their_businesses(self):
        r = self.client.get(reverse('my-memberships'), **self._auth(self.member))
        data = r.json()
        self.assertEqual(r.status_code, 200)
        self.assertEqual(data['owned'], [])
        self.assertEqual(len(data['memberships']), 1)
        self.assertEqual(data['memberships'][0]['business_id'], self.owner.pk)

    def test_owner_sees_owned_business(self):
        r = self.client.get(reverse('my-memberships'), **self._auth(self.owner))
        data = r.json()
        self.assertEqual(len(data['owned']), 1)
        self.assertEqual(data['owned'][0]['is_customer'], True)


class MembershipSyncIsolationTests(TestCase):
    """A member JWT authorizes sync for their business only — never another tenant."""

    def setUp(self):
        self.biz_a = User.objects.create_user(
            username='biza', email='biza@x.com', password='pw12345'
        )
        self.biz_a.is_customer = True
        self.biz_a.business_name = 'Business A'
        self.biz_a.save()
        self.biz_b = User.objects.create_user(
            username='bizb', email='bizb@x.com', password='pw12345'
        )
        self.biz_b.is_customer = True
        self.biz_b.business_name = 'Business B'
        self.biz_b.save()
        plan = LicensePlan.objects.create(name='Pro', duration_months=12, device_limit=5, price='50.00')
        self.license_a = License.objects.create(
            customer=self.biz_a, plan=plan,
            start_date=date(2026, 1, 1), expiry_date=date(2027, 1, 1), device_limit=5,
        )
        self.license_b = License.objects.create(
            customer=self.biz_b, plan=plan,
            start_date=date(2026, 1, 1), expiry_date=date(2027, 1, 1), device_limit=5,
        )
        self.member_b = User.objects.create_user(
            username='memberb', email='memberb@x.com', password='pw12345'
        )
        BusinessMembership.objects.create(user=self.member_b, business=self.biz_b, role='cashier')

    def _push(self, user, device_id):
        return self.client.post(
            reverse('sync:push'),
            data=json.dumps({
                'device_id': device_id, 'device_name': 'Member Terminal',
                'changes': [
                    {'entity': 'items', 'entity_uuid': f'item-{device_id}', 'op': 'INSERT', 'seq': 1,
                     'payload': {'name': f'Widget-{device_id}'}, 'checksum': 'abc'},
                ],
            }),
            content_type='application/json',
            **{'HTTP_AUTHORIZATION': f'Bearer {RefreshToken.for_user(user).access_token}',
               'HTTP_X_DEVICE_ID': device_id},
        )

    def test_member_pushes_to_their_business(self):
        r = self._push(self.member_b, 'member-device-1')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(SyncRecord.objects.filter(business=self.biz_b).count(), 1)
        self.assertEqual(SyncRecord.objects.filter(business=self.biz_a).count(), 0)

    def test_member_cannot_write_into_another_business(self):
        # Even if the client claims business A, the tenant must be the member's
        # own business (server-derived).
        device = 'sneaky-device'
        r = self.client.post(
            reverse('sync:push'),
            data=json.dumps({
                'device_id': device, 'device_name': 'Terminal',
                'business_id': self.biz_a.pk,
                'changes': [
                    {'entity': 'items', 'entity_uuid': 'item-sneaky', 'op': 'INSERT', 'seq': 1,
                     'payload': {'name': 'Sneaky'}, 'checksum': 'abc'},
                ],
            }),
            content_type='application/json',
            **{'HTTP_AUTHORIZATION': f'Bearer {RefreshToken.for_user(self.member_b).access_token}',
               'HTTP_X_DEVICE_ID': device},
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(SyncRecord.objects.filter(business=self.biz_b).count(), 1)
        self.assertEqual(SyncRecord.objects.filter(business=self.biz_a).count(), 0)

    def test_member_pull_is_scoped_to_their_business(self):
        # Seed a record under business A directly.
        SyncRecord.objects.create(
            business=self.biz_a, device=self._device_for(self.biz_a, 'a-device'),
            client_seq=1, entity='items', entity_uuid='item-a',
            payload={},
        )
        SyncRecord.objects.create(
            business=self.biz_b, device=self._device_for(self.biz_b, 'b-device'),
            client_seq=1, entity='items', entity_uuid='item-b',
            payload={},
        )
        r = self.client.get(
            reverse('sync:pull') + '?since=0',
            **{'HTTP_AUTHORIZATION': f'Bearer {RefreshToken.for_user(self.member_b).access_token}',
               'HTTP_X_DEVICE_ID': 'member-device-2'},
        )
        self.assertEqual(r.status_code, 200)
        uuids = [c['entity_uuid'] for c in r.json()['changes']]
        self.assertIn('item-b', uuids)
        self.assertNotIn('item-a', uuids)

    def test_non_member_user_is_rejected(self):
        stranger = User.objects.create_user(
            username='stranger', email='stranger@x.com', password='pw12345'
        )
        r = self._push(stranger, 'stranger-device')
        self.assertEqual(r.status_code, 403)

    def test_removed_member_loses_access(self):
        self._push(self.member_b, 'member-device-3')
        BusinessMembership.objects.filter(user=self.member_b).delete()
        r = self._push(self.member_b, 'member-device-3')
        self.assertEqual(r.status_code, 403)

    def _device_for(self, business, device_id):
        from sync.models import SyncDevice
        dev = SyncDevice.objects.create(
            business=business, device_id=device_id, device_name='T',
            license=business.licenses.first(), is_active=True, status='active', secret_hash='x',
        )
        return dev