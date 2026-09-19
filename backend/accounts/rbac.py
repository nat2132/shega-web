"""
Server-side mirror of the @shega/shared permission catalog (RBAC).

The mobile + desktop clients enforce role-based access on-device using the
canonical TypeScript engine under ``@shega/shared``. The backend carries the
same catalog as plain data so it can enforce the same rules authoritatively
(the cloud is a source of truth for what a member may push/mutate), without a
TS runtime.

Anything not listed for a role defaults to ``false`` (denied). Values are
``True``, ``False``, ``'approval'`` (allowed only with an approver) or
``'limited'``.
"""

ROLE_ORDER = ['owner', 'manager', 'cashier', 'inventory', 'accountant', 'reports', 'warehouse']

ROLE_NAMES = {'owner': 'Owner', 'manager': 'Manager', 'cashier': 'Cashier', 'inventory': 'Inventory', 'accountant': 'Accountant / Finance', 'reports': 'Reports', 'warehouse': 'Warehouse'}

PERMISSIONS_BY_ROLE = {
    'owner': {
    'customers.manage': True,
    'customers.view': True,
    'devices.manage': True,
    'devices.view': True,
    'inventory.adjust': True,
    'inventory.count': True,
    'inventory.receive': True,
    'inventory.suppliers': True,
    'inventory.transfer': True,
    'ownership.deleteBusiness': True,
    'ownership.transfer': True,
    'payments.cashDrawer': True,
    'payments.manageExpenses': True,
    'payments.process': True,
    'products.changePrice': True,
    'products.create': True,
    'products.delete': True,
    'products.edit': True,
    'products.scanBarcode': True,
    'products.view': True,
    'products.viewStock': True,
    'registers.manage': True,
    'registers.openShift': True,
    'registers.view': True,
    'reports.export': True,
    'reports.viewAll': True,
    'reports.viewOwn': True,
    'sales.checkout': True,
    'sales.create': True,
    'sales.discount.limited': True,
    'sales.discount.unlimited': True,
    'sales.hold': True,
    'sales.priceOverride': True,
    'sales.printReceipt': True,
    'sales.refund': True,
    'sales.scan': True,
    'sales.search': True,
    'sales.viewAll': True,
    'sales.viewOwn': True,
    'sales.void': True,
    'settings.manage': True,
    'settings.view': True,
    'subscription.manage': True,
    'subscription.view': True,
    'tax.configure': True,
    'tax.view': True,
    'team.assignRoles': True,
    'team.manage': True,
    'team.view': True,
    },
    'manager': {
    'customers.manage': True,
    'customers.view': True,
    'devices.manage': False,
    'devices.view': True,
    'inventory.adjust': 'approval',
    'inventory.count': True,
    'inventory.receive': True,
    'inventory.suppliers': True,
    'inventory.transfer': True,
    'ownership.deleteBusiness': False,
    'ownership.transfer': False,
    'payments.cashDrawer': 'approval',
    'payments.manageExpenses': True,
    'payments.process': True,
    'products.changePrice': 'approval',
    'products.create': True,
    'products.delete': 'approval',
    'products.edit': True,
    'products.scanBarcode': True,
    'products.view': True,
    'products.viewStock': True,
    'registers.manage': True,
    'registers.openShift': True,
    'registers.view': True,
    'reports.export': True,
    'reports.viewAll': True,
    'reports.viewOwn': True,
    'sales.checkout': True,
    'sales.create': True,
    'sales.discount.limited': True,
    'sales.discount.unlimited': 'approval',
    'sales.hold': True,
    'sales.priceOverride': 'approval',
    'sales.printReceipt': True,
    'sales.refund': 'approval',
    'sales.scan': True,
    'sales.search': True,
    'sales.viewAll': True,
    'sales.viewOwn': True,
    'sales.void': 'approval',
    'settings.manage': False,
    'settings.view': True,
    'subscription.manage': False,
    'subscription.view': False,
    'tax.configure': 'approval',
    'tax.view': True,
    'team.assignRoles': False,
    'team.manage': True,
    'team.view': True,
    },
    'cashier': {
    'customers.manage': False,
    'customers.view': True,
    'devices.manage': False,
    'devices.view': False,
    'inventory.adjust': False,
    'inventory.count': False,
    'inventory.receive': False,
    'inventory.suppliers': False,
    'inventory.transfer': False,
    'ownership.deleteBusiness': False,
    'ownership.transfer': False,
    'payments.cashDrawer': False,
    'payments.manageExpenses': False,
    'payments.process': True,
    'products.changePrice': False,
    'products.create': False,
    'products.delete': False,
    'products.edit': False,
    'products.scanBarcode': False,
    'products.view': True,
    'products.viewStock': True,
    'registers.manage': False,
    'registers.openShift': True,
    'registers.view': False,
    'reports.export': False,
    'reports.viewAll': False,
    'reports.viewOwn': True,
    'sales.checkout': True,
    'sales.create': True,
    'sales.discount.limited': True,
    'sales.discount.unlimited': 'approval',
    'sales.hold': True,
    'sales.priceOverride': False,
    'sales.printReceipt': True,
    'sales.refund': 'approval',
    'sales.scan': True,
    'sales.search': True,
    'sales.viewAll': False,
    'sales.viewOwn': True,
    'sales.void': False,
    'settings.manage': False,
    'settings.view': False,
    'subscription.manage': False,
    'subscription.view': False,
    'tax.configure': False,
    'tax.view': False,
    'team.assignRoles': False,
    'team.manage': False,
    'team.view': False,
    },
    'inventory': {
    'customers.manage': False,
    'customers.view': False,
    'devices.manage': False,
    'devices.view': False,
    'inventory.adjust': 'approval',
    'inventory.count': True,
    'inventory.receive': True,
    'inventory.suppliers': True,
    'inventory.transfer': True,
    'ownership.deleteBusiness': False,
    'ownership.transfer': False,
    'payments.cashDrawer': False,
    'payments.manageExpenses': False,
    'payments.process': False,
    'products.changePrice': False,
    'products.create': True,
    'products.delete': False,
    'products.edit': True,
    'products.scanBarcode': True,
    'products.view': True,
    'products.viewStock': True,
    'registers.manage': False,
    'registers.openShift': False,
    'registers.view': False,
    'reports.export': False,
    'reports.viewAll': False,
    'reports.viewOwn': False,
    'sales.checkout': False,
    'sales.create': False,
    'sales.scan': False,
    'sales.search': False,
    'settings.manage': False,
    'settings.view': False,
    'subscription.manage': False,
    'subscription.view': False,
    'tax.configure': False,
    'tax.view': False,
    'team.assignRoles': False,
    'team.manage': False,
    'team.view': False,
    },
    'accountant': {
    'customers.manage': True,
    'customers.view': True,
    'devices.view': False,
    'inventory.adjust': False,
    'inventory.receive': False,
    'ownership.deleteBusiness': False,
    'ownership.transfer': False,
    'payments.cashDrawer': 'approval',
    'payments.manageExpenses': True,
    'payments.process': False,
    'products.view': True,
    'products.viewStock': True,
    'registers.manage': False,
    'registers.view': True,
    'reports.export': True,
    'reports.viewAll': True,
    'reports.viewOwn': True,
    'sales.printReceipt': True,
    'sales.refund': 'approval',
    'sales.viewAll': True,
    'sales.viewOwn': True,
    'settings.view': False,
    'subscription.view': False,
    'tax.configure': 'approval',
    'tax.view': True,
    'team.view': False,
    },
    'reports': {
    'customers.view': True,
    'devices.view': False,
    'products.view': True,
    'products.viewStock': True,
    'registers.view': True,
    'reports.export': True,
    'reports.viewAll': True,
    'reports.viewOwn': True,
    'sales.printReceipt': True,
    'sales.viewAll': True,
    'sales.viewOwn': True,
    'settings.view': False,
    'tax.view': True,
    },
    'warehouse': {
    'customers.view': False,
    'inventory.adjust': 'approval',
    'inventory.count': True,
    'inventory.receive': True,
    'inventory.suppliers': True,
    'inventory.transfer': True,
    'products.scanBarcode': True,
    'products.view': True,
    'products.viewStock': True,
    'reports.viewOwn': True,
    'sales.create': False,
    },
}


def effective_permissions(role_key="cashier", overrides=None):
    """Effective permission set for a role: defaults + per-user overrides."""
    base = dict(PERMISSIONS_BY_ROLE.get(role_key or 'cashier', {}))
    if isinstance(overrides, dict):
        for key, value in overrides.items():
            if value is None:
                continue
            base[key] = value
    return base


def can(permissions, key, can_approve=False):
    """Boolean permission check mirroring checkPermission(can).

    ``'approval'`` grants only when ``can_approve`` is set (the approver is then
    performing or authorising the action themselves). ``'limited'``/missing all
    deny.
    """
    value = permissions.get(key)
    if value is True:
        return True
    if value == 'approval' and can_approve:
        return True
    return False


def membership_permissions(role_key, permissions_json):
    """Build the effective set for a BusinessMembership (role + overrides)."""
    overrides = None
    if isinstance(permissions_json, dict):
        overrides = permissions_json
    return {"role": role_key, "permissions": effective_permissions(role_key, overrides)}
