import json
from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User, BusinessMembership
from accounts.rbac import (
    PERMISSIONS_BY_ROLE,
    ROLE_ORDER,
    ROLE_NAMES,
    can,
    effective_permissions,
)
from licenses.models import LicensePlan, License
from .authorization import hash_device_key
from .models import SyncDevice


class RBACMirrorTests(TestCase):
    """The server catalog stays authoritative and mirrors @shega/shared."""

    def test_catalog_covers_all_builtin_roles(self):
        self.assertEqual(ROLE_ORDER, ['owner', 'manager', 'cashier', 'inventory', 'accountant', 'reports', 'warehouse'])
        for role in ROLE_ORDER:
            self.assertIn(role, ROLE_NAMES)
            # Owner/manager/cashier enumerate the full catalog; specialist roles
            # expose only their relevant slice of the 49 permissions.
            self.assertTrue(10 <= len(PERMISSIONS_BY_ROLE[role]) <= 49)
            for value in PERMISSIONS_BY_ROLE[role].values():
                self.assertIn(value, (True, False, 'approval', 'limited'))

    def test_deny_by_default(self):
        for role in ROLE_ORDER:
            self.assertFalse(can(PERMISSIONS_BY_ROLE[role], 'unknown.key'))

    def test_owner_full_access(self):
        perms = PERMISSIONS_BY_ROLE['owner']
        for key in ('team.manage', 'team.assignRoles', 'devices.manage', 'registers.manage',
                    'settings.manage', 'ownership.transfer', 'sales.refund'):
            self.assertTrue(can(perms, key))

    def test_cashier_restricted(self):
        perms = PERMISSIONS_BY_ROLE['cashier']
        self.assertTrue(can(perms, 'sales.create'))
        self.assertTrue(can(perms, 'products.view'))
        for key in ('team.manage', 'devices.manage', 'registers.manage', 'settings.manage',
                    'sales.refund', 'reports.viewAll', 'payments.manageExpenses'):
            self.assertFalse(can(perms, key))

    def test_manager_orchestrates_team_not_hardware(self):
        perms = PERMISSIONS_BY_ROLE['manager']
        self.assertTrue(can(perms, 'team.manage'))
        self.assertTrue(can(perms, 'registers.manage'))
        self.assertFalse(can(perms, 'devices.manage'))
        self.assertFalse(can(perms, 'settings.manage'))

    def test_specialist_roles(self):
        self.assertTrue(can(PERMISSIONS_BY_ROLE['warehouse'], 'inventory.transfer'))
        self.assertFalse(can(PERMISSIONS_BY_ROLE['warehouse'], 'team.manage'))
        self.assertTrue(can(PERMISSIONS_BY_ROLE['accountant'], 'payments.manageExpenses'))
        self.assertTrue(can(PERMISSIONS_BY_ROLE['reports'], 'reports.viewAll'))
        self.assertFalse(can(PERMISSIONS_BY_ROLE['reports'], 'inventory.adjust'))

    def test_approval_values_require_approver(self):
        perms = PERMISSIONS_BY_ROLE['manager']
        self.assertEqual(perms['sales.discount.unlimited'], 'approval')
        self.assertFalse(can(perms, 'sales.discount.unlimited'))
        self.assertTrue(can(perms, 'sales.discount.unlimited', can_approve=True))

    def test_overrides_merge_on_top_of_role_defaults(self):
        base = effective_permissions('cashier')
        self.assertFalse(can(base, 'team.manage'))
        upgraded = effective_permissions('cashier', {'team.manage': True, 'devices.manage': 'limited'})
        self.assertTrue(can(upgraded, 'team.manage'))
        self.assertFalse(can(upgraded, 'devices.manage'))
        # Keys absent in the override keep the role default.
        self.assertTrue(can(upgraded, 'sales.create'))

    def test_membership_helpers(self):
        owner = User.objects.create_user(username='rw', email='rw@x.com', password='pw')
        owner.is_customer = True
        owner.save()
        member = User.objects.create_user(username='rwm', email='rwm@x.com', password='pw')
        m = BusinessMembership.objects.create(user=member, business=owner, role='manager')
        self.assertTrue(m.can('team.manage'))
        m.role = 'cashier'
        m.permissions = {'team.manage': True}
        m.save()
        self.assertTrue(m.can('team.manage'))
        self.assertFalse(m.can('devices.manage'))


class SyncPushRBACTests(TestCase):
    """Sensitive tenant-management entities are gated by canonical permissions."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='rbacowner', email='rbacowner@x.com', password='pw12345'
        )
        self.owner.is_customer = True
        self.owner.business_name = 'RBAC Biz'
        self.owner.save()
        plan = LicensePlan.objects.create(name='Pro', duration_months=12, device_limit=5, price='50.00')
        self.license = License.objects.create(
            customer=self.owner, plan=plan,
            start_date=date(2026, 1, 1), expiry_date=date(2027, 1, 1), device_limit=5,
        )
        self.cashier = User.objects.create_user(
            username='rbaccashier', email='rbaccashier@x.com', password='pw12345'
        )
        self.manager = User.objects.create_user(
            username='rbacmanager', email='rbacmanager@x.com', password='pw12345'
        )
        BusinessMembership.objects.create(user=self.cashier, business=self.owner, role='cashier')
        BusinessMembership.objects.create(user=self.manager, business=self.owner, role='manager')
        self.d1 = 'rbac-device-owner'
        self.d2 = 'rbac-device-cashier'
        self.d3 = 'rbac-device-manager'

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

    def _change(self, entity):
        return {
            'entity': entity, 'entity_uuid': f'{entity}-uuid-1',
            'op': 'INSERT', 'seq': 1, 'payload': {},
        }

    def test_owner_pushes_everything(self):
        for entity in ('users', 'business_roles', 'registers', 'locations', 'devices', 'businesses', 'items'):
            r = self._push(self.owner, self.d1, self._change(entity))
            self.assertEqual(r.status_code, 200, entity)

    def test_cashier_cannot_push_team_entities(self):
        for entity in ('users', 'business_roles'):
            r = self._push(self.cashier, self.d2, self._change(entity))
            self.assertEqual(r.status_code, 403, entity)

    def test_cashier_cannot_push_hardware_entities(self):
        for entity in ('registers', 'locations', 'devices'):
            r = self._push(self.cashier, self.d2, self._change(entity))
            self.assertEqual(r.status_code, 403, entity)

    def test_cashier_can_push_daily_operations(self):
        for entity in ('items', 'customers', 'sales', 'debt_payments', 'expenses'):
            r = self._push(self.cashier, self.d2, self._change(entity))
            self.assertEqual(r.status_code, 200, entity)

    def test_manager_can_push_team_entities(self):
        for entity in ('users', 'business_roles'):
            r = self._push(self.manager, self.d3, self._change(entity))
            self.assertEqual(r.status_code, 200, entity)

    def test_manager_can_push_registers_but_not_devices(self):
        r = self._push(self.manager, self.d3, self._change('registers'))
        self.assertEqual(r.status_code, 200)
        r = self._push(self.manager, self.d3, self._change('locations'))
        self.assertEqual(r.status_code, 200)
        r = self._push(self.manager, self.d3, self._change('devices'))
        self.assertEqual(r.status_code, 403)

    def test_owner_only_business_metadata(self):
        r = self._push(self.manager, self.d3, self._change('businesses'))
        self.assertEqual(r.status_code, 403)

    def test_device_key_hub_has_owner_level(self):
        self._push(self.owner, self.d1, self._change('items'))
        SyncDevice.objects.filter(device_id=self.d1).update(secret_hash=hash_device_key('hub-secret'))
        r = self._push(self.owner, self.d1, self._change('users'), key='hub-secret')
        self.assertEqual(r.status_code, 200)
        r = self._push(self.owner, self.d1, self._change('businesses'), key='hub-secret')
        self.assertEqual(r.status_code, 200)

    def test_desktop_cashier_via_device_key_is_not_owner(self):
        # Equity guarantee (Section U rework): a device that joined as a cashier
        # must STAY a cashier even when it authenticates as a desktop hub via a
        # provisioned device key — the transport never escalates to owner.
        self._push(self.cashier, self.d2, self._change('items'))
        SyncDevice.objects.filter(device_id=self.d2).update(secret_hash=hash_device_key('cashier-desk-secret'))
        # cashier's device can still do daily operations via the key…
        r = self._push(self.cashier, self.d2, self._change('sales'), key='cashier-desk-secret')
        self.assertEqual(r.status_code, 200)
        # …but must NOT manage the team or business metadata.
        r = self._push(self.cashier, self.d2, self._change('users'), key='cashier-desk-secret')
        self.assertEqual(r.status_code, 403)
        r = self._push(self.cashier, self.d2, self._change('businesses'), key='cashier-desk-secret')
        self.assertEqual(r.status_code, 403)

    def test_owner_device_key_from_any_platform_is_owner(self):
        # A device-key carrying the owner role keeps full access regardless of
        # whether the requesting platform is mobile or desktop.
        self._push(self.owner, self.d1, self._change('items'))
        SyncDevice.objects.filter(device_id=self.d1).update(secret_hash=hash_device_key('owner-key'))
        for entity in ('users', 'businesses', 'devices', 'registers'):
            r = self._push(self.owner, self.d1, self._change(entity), key='owner-key')
            self.assertEqual(r.status_code, 200, entity)

    def test_member_without_active_membership_is_refused(self):
        outsider = User.objects.create_user(username='rbacghost', email='rbacghost@x.com', password='pw12345')
        BusinessMembership.objects.filter(user=self.cashier, business=self.owner).update(is_active=False)
        r = self._push(self.cashier, self.d2, self._change('items'))
        self.assertIn(r.status_code, (403,))
        r = self._push(outsider, 'rbac-device-ghost', self._change('items'))
        self.assertIn(r.status_code, (403,))


class MembershipManagementRBBCTests(TestCase):
    """A member with team.manage may manage the roster; cashier may not."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='mowner', email='mowner@x.com', password='pw12345'
        )
        self.owner.is_customer = True
        self.owner.business_name = 'Mgmt Biz'
        self.owner.save()
        self.cashier = User.objects.create_user(
            username='mcashier', email='mcashier@x.com', password='pw12345'
        )
        self.manager = User.objects.create_user(
            username='mmanager', email='mmanager@x.com', password='pw12345'
        )
        self.target = User.objects.create_user(
            username='mtarget', email='mtarget@x.com', password='pw12345'
        )
        self.cashier_ms = BusinessMembership.objects.create(user=self.cashier, business=self.owner, role='cashier')
        self.manager_ms = BusinessMembership.objects.create(user=self.manager, business=self.owner, role='manager')

    def _auth(self, user):
        return {'HTTP_AUTHORIZATION': f'Bearer {RefreshToken.for_user(user).access_token}'}

    def test_owner_adds_inventory_role(self):
        r = self.client.post(
            reverse('business-members', args=[self.owner.pk]),
            data=json.dumps({'email': self.target.email, 'role': 'inventory'}),
            content_type='application/json',
            **self._auth(self.owner),
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['role'], 'inventory')

    def test_owner_assigns_permission_overrides(self):
        r = self.client.post(
            reverse('business-members', args=[self.owner.pk]),
            data=json.dumps({'email': self.target.email, 'role': 'cashier',
                             'permissions': {'team.manage': True}}),
            content_type='application/json',
            **self._auth(self.owner),
        )
        self.assertEqual(r.status_code, 201)
        ms = BusinessMembership.objects.get(user=self.target, business=self.owner)
        self.assertTrue(ms.can('team.manage'))

    def test_owner_updates_roster_and_patch_permissions(self):
        r = self.client.patch(
            reverse('business-membership-detail', args=[self.owner.pk, self.cashier_ms.pk]),
            data=json.dumps({'role': 'accountant', 'permissions': {'team.manage': False}}),
            content_type='application/json',
            **self._auth(self.owner),
        )
        self.assertEqual(r.status_code, 200)
        ms = BusinessMembership.objects.get(pk=self.cashier_ms.pk)
        self.assertEqual(ms.role, 'accountant')
        self.assertTrue(ms.can('payments.manageExpenses'))

    def test_manager_with_team_manage_adds_member(self):
        r = self.client.post(
            reverse('business-members', args=[self.owner.pk]),
            data=json.dumps({'email': self.target.email, 'role': 'cashier'}),
            content_type='application/json',
            **self._auth(self.manager),
        )
        self.assertEqual(r.status_code, 201)

    def test_manager_can_update_other_member_roles(self):
        r = self.client.patch(
            reverse('business-membership-detail', args=[self.owner.pk, self.cashier_ms.pk]),
            data=json.dumps({'role': 'reports'}),
            content_type='application/json',
            **self._auth(self.manager),
        )
        self.assertEqual(r.status_code, 200)

    def test_cashier_cannot_manage_memberships(self):
        r = self.client.post(
            reverse('business-members', args=[self.owner.pk]),
            data=json.dumps({'email': self.target.email}),
            content_type='application/json',
            **self._auth(self.cashier),
        )
        self.assertEqual(r.status_code, 403)
        r2 = self.client.patch(
            reverse('business-membership-detail', args=[self.owner.pk, self.manager_ms.pk]),
            data=json.dumps({'role': 'cashier'}),
            content_type='application/json',
            **self._auth(self.cashier),
        )
        self.assertEqual(r2.status_code, 403)

    def test_custom_role_starts_empty_and_takes_overrides(self):
        # A custom role has no builtin defaults — everything it gains comes from
        # the member's permission overrides.
        r = self.client.post(
            reverse('business-members', args=[self.owner.pk]),
            data=json.dumps({'email': self.target.email, 'role': 'custom'}),
            content_type='application/json',
            **self._auth(self.owner),
        )
        self.assertEqual(r.status_code, 201)
        ms = BusinessMembership.objects.get(user=self.target, business=self.owner)
        self.assertFalse(ms.can('sales.create'))
        self.assertFalse(ms.can('team.manage'))
        ms.permissions = {'sales.create': True, 'team.manage': True}
        ms.save()
        self.assertTrue(ms.can('sales.create'))
        self.assertTrue(ms.can('team.manage'))