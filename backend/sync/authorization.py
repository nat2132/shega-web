from datetime import date

from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied, NotAuthenticated

from accounts.models import BusinessMembership
from .models import SyncDevice
from .security import hash_device_key, validate_device_id, validate_device_name


def _license_ok(lic):
    """A license is usable for cloud sync when active and not expired."""
    if not lic:
        return False
    if lic.status != 'active':
        return False
    if lic.expiry_date is not None and lic.expiry_date < date.today():
        return False
    return True


def _find_active_license(user):
    """The current usable license for a business (owner user)."""
    for lic in user.licenses.order_by('-created_at'):
        if _license_ok(lic):
            return lic
    return None


def _device_capacity_ok(business, lic):
    """A business may auto-register sync devices only up to license capacity.

    ``device_limit`` 0 means unlimited. The count is over this business's active
    cloud ``SyncDevice`` rows (distinct registry), not the roster activations,
    so a Basic (device_limit=1) business cannot register unlimited cloud devices
    by simply presenting a valid JWT.
    """
    if lic.device_limit == 0:
        return True
    active = SyncDevice.objects.filter(business=business, is_active=True).count()
    return active < lic.device_limit


def _device_principal(business, device, authed_user, via_device_key=False):
    """Resolve the effective RBAC principal for a device.

    Ownership/permissions are decided by the *business-level* role carried by
    the device (or the authenticated user's membership), never by platform or
    by the transport (device-key vs JWT). This is the key step that makes
    Desktop and Mobile equal participants: a desktop that joined as a cashier
    is a cashier, and a mobile owner is an owner — both are just devices/members
    of the same business.

    - Device-key transport: the principal is the device's stored ``role_key``
      (never escalated to owner by the transport alone).
    - JWT member transport: the live ``BusinessMembership`` is authoritative
      (role + overrides), falling back to the device's role when no membership
      row exists.

    Returns ``(level, permissions)`` where level is ``'owner'`` (full access)
    or ``'member'`` carrying the effective permission dict.
    """
    from accounts.rbac import effective_permissions

    def _member(role_key, overrides=None):
        return 'member', effective_permissions(role_key, overrides)

    if via_device_key:
        # Prefer the bound user's LIVE membership — identity/role live on the
        # user's BusinessMembership, not the device. Only fall back to the
        # device's role_key mirror when the device is not yet bound to a person.
        if getattr(device, 'user_id', None) is not None:
            bound = BusinessMembership.objects.filter(
                user_id=device.user_id, business=business, is_active=True
            ).select_related('business').first()
            if bound:
                level, perms = _member(bound.role, bound.permissions or {})
                if bound.role == 'owner':
                    return 'owner', perms
                return level, perms
        role_key = getattr(device, 'role_key', None) or 'cashier'
        if role_key == 'owner':
            return 'owner', effective_permissions('owner')
        return _member(role_key)

    user = authed_user
    if user == business or (
        getattr(user, 'is_admin', False)
        or getattr(user, 'is_staff', False)
        or getattr(user, 'is_superuser', False)
    ):
        return 'owner', effective_permissions('owner')

    membership = BusinessMembership.objects.filter(
        user=user, business=business, is_active=True
    ).select_related('business').first()
    if membership:
        perms = membership.effective_permissions()
        if membership.role == 'owner':
            return 'owner', perms
        return 'member', perms

    # No membership row — fall back to the device's own role so a paired device
    # still resolves a sane (non-escalated) principal.
    role_key = getattr(device, 'role_key', None) or 'cashier'
    if role_key == 'owner':
        return 'owner', effective_permissions('owner')
    return _member(role_key)


class SyncAuthedDevice:
    def __init__(self, sync_device, license_obj, business, authed_user, via_device_key=False):
        self.sync_device = sync_device
        self.license = license_obj
        self.business = business
        self.authed_user = authed_user
        self.via_device_key = via_device_key


def _resolve_device(business, device_id):
    """Look up a device of a business regardless of status.

    Includes pending/devices so the caller can distinguish 'not known yet'
    (auto-register) from 'known but awaiting approval' (refuse sync).
    """
    if not device_id:
        return None
    try:
        return SyncDevice.objects.get(business=business, device_id=device_id)
    except SyncDevice.DoesNotExist:
        return None


def authorize_device(request, body=None) -> SyncAuthedDevice:
    """Enforce the §20 auth chain for one sync request.

    1. Authenticated principal: either a JWT customer user (mobile) or a
       provisioned device key bound to a business (desktop hub).
    2. Business membership: the tenant is derived from that principal, never
       from a client-supplied ``business_id``.
    3. Device identity: an ``X-Device-Id`` (or body ``device_id``) must map to a
       registered sync device of that business.
    4. Role/permissions: the device must not be in a blocking roster status.
    5. Subscription/device authorization: the business must hold an active
       license and the device must be within that license.
    6. Sync authorization: a disabled/removed/locked device is refused even if
       it still possesses a valid token.
    """
    body = body or {}

    # --- Device-key mode (desktop hub) ---
    key = request.headers.get('X-Device-Key')
    if key:
        device_id = (
            request.headers.get('X-Device-Id')
            or body.get('device_id')
            or request.query_params.get('device')
        )
        device_id = validate_device_id(device_id) if device_id else ''
        if not device_id:
            raise NotAuthenticated('device identity required')
        # The device key is bound to a specific device: look the device up by its
        # identity, then verify the key. This closes key-replay across devices.
        dev = SyncDevice.objects.filter(device_id=device_id, is_active=True).first()
        if not dev or not dev.secret_hash:
            raise AuthenticationFailed('invalid device credentials')
        # Constant-time comparison of the re-derived hash against the stored one.
        import hmac as _hmac
        if not _hmac.compare_digest(dev.secret_hash, hash_device_key(key)):
            raise AuthenticationFailed('invalid device credentials')
        if dev.blocked:
            raise PermissionDenied('device not authorized for sync')
        lic = _find_active_license(dev.business)
        if not _license_ok(lic):
            raise PermissionDenied('no active subscription')
        # Refresh this device's transport role from its bound user's live
        # membership so a desktop that uses the device-key transport is not
        # served a stale role snapshot after a member's role changes (§11).
        if dev.user_id is not None:
            bound = BusinessMembership.objects.filter(
                user_id=dev.user_id, business=dev.business, is_active=True
            ).first()
            if bound and bound.role != dev.role_key:
                dev.role_key = bound.role
                dev.save(update_fields=['role_key'])
        dev.last_seen = timezone.now()
        dev.save(update_fields=['last_seen'])
        return SyncAuthedDevice(dev, lic, dev.business, dev.business, via_device_key=True)

    # --- JWT mode (mobile) ---
    user = request.user
    if not user or not user.is_authenticated:
        raise NotAuthenticated('authentication required')
    if getattr(user, 'is_customer', False):
        # The business owner themselves: the tenant is the requesting account.
        business = user
    else:
        # A member account: tenant is derived from their active membership,
        # never from a client-supplied business id.
        membership = BusinessMembership.objects.filter(
            user=user, is_active=True
        ).select_related('business').first()
        if not membership or not getattr(membership.business, 'is_customer', False):
            raise PermissionDenied('account has no business')
        business = membership.business

    device_id = validate_device_id(request.headers.get('X-Device-Id') or body.get('device_id'))
    lic = _find_active_license(business)
    if not _license_ok(lic):
        raise PermissionDenied('no active subscription for this business')

    dev = _resolve_device(business, device_id)
    if dev and dev.status == 'pending':
        # Paired but not yet approved: never sync, never reactivate.
        raise PermissionDenied('device is awaiting owner approval')
    if not dev:
        # Auto-register the first sync device a business uses (owner's POS) so
        # first-run cloud sync does not hard-fail — but only within license
        # capacity (spec §20 / Appendix J).
        if not _device_capacity_ok(business, lic):
            raise PermissionDenied('device capacity for this license is exhausted')
        name = validate_device_name(body.get('device_name'))
        platform = str(body.get('platform') or 'mobile').lower().strip()
        if platform not in ('mobile', 'desktop'):
            platform = 'mobile'
        # The device's business-level role mirrors the authenticated principal.
        # It is NEVER escalated to 'owner' merely because the request is a JWT
        # member or because the transport is a device key; a cashier's device is
        # a cashier, a manager's device is a manager, an owner's is an owner.
        if getattr(user, 'is_customer', False):
            role_key = 'owner'
        else:
            # Mirror the account's active membership role for this business.
            membership = BusinessMembership.objects.filter(
                user=user, business=business, is_active=True
            ).first()
            role_key = (membership.role if membership else None) or 'cashier'
        dev, created = SyncDevice.objects.get_or_create(
            business=business,
            device_id=device_id,
            defaults={
                'license': lic,
                'device_name': name,
                'platform': platform,
                'is_active': True,
                'status': 'active',
                'role_key': role_key,
                # Bind this physical device to the person using it so all of a
                # user's devices (desktop + mobile) resolve to the SAME account
                # and its BusinessMembership — identity lives on the user, not
                # the platform.
                'user': user,
            },
        )
        if created:
            # Brand-new device: bind to the authenticated person so all of a
            # user's devices (desktop + mobile) resolve to the SAME account.
            dev.user = user
            dev.last_seen = timezone.now()
            dev.save(update_fields=['user', 'role_key', 'last_seen'])
        else:
            # The post-block refresh below keeps role_key in lockstep with the
            # live membership; here we only make sure a reuse of an unbound
            # device row is attributed to the person using it.
            if dev.user_id is None:
                dev.user = user
                dev.save(update_fields=['user'])
            dev.last_seen = timezone.now()
            dev.save(update_fields=['last_seen'])
    if dev.license_id != lic.id:
        raise PermissionDenied('device not bound to active license')
    if dev.blocked or not dev.is_active:
        raise PermissionDenied('device not authorized for sync')
    # Refresh the device's transport role from the LIVE membership so a role
    # change on the authoritative BusinessMembership propagates to every device
    # of that user on their next sync — both JWT and (already handled above)
    # device-key transports (§11). No per-device role is authoritative.
    if dev.user_id is None and not getattr(user, 'is_customer', False):
        bound_ms = BusinessMembership.objects.filter(
            user=user, business=business, is_active=True
        ).first()
        if bound_ms:
            dev.user = user
            dev.role_key = bound_ms.role
            dev.save(update_fields=['user', 'role_key'])
    elif dev.user_id is not None:
        bound_ms = BusinessMembership.objects.filter(
            user_id=dev.user_id, business=business, is_active=True
        ).first()
        if bound_ms and bound_ms.role != dev.role_key:
            dev.role_key = bound_ms.role
            dev.save(update_fields=['role_key'])
    dev.last_seen = timezone.now()
    dev.save(update_fields=['last_seen'])
    return SyncAuthedDevice(dev, lic, business, user, via_device_key=False)
