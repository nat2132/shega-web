from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.decorators import api_view, permission_classes

from .models import SyncRecord, SyncDevice
from .authorization import authorize_device, _device_principal, _find_active_license
from .audit_chain import submit_audit_chain, verify_business_audit_chain
from accounts.permissions import IsAdminUser
from accounts.models import BusinessMembership
from accounts.rbac import can, effective_permissions
from accounts.views import _can_manage_members
from .pairing_views import _current_business
from .security import (
    validate_device_id,
    validate_device_name,
    validate_entity,
    validate_op,
    validate_payload,
)

# FK-safe apply order mirroring the mobile client so a pull applies parent rows
# before the rows that reference them.
APPLY_ORDER = [
    'businesses', 'categories', 'items', 'item_packs', 'customers',
    'sales', 'debt_payments', 'expenses', 'adjustments', 'returns',
    'locations', 'registers', 'business_roles', 'users', 'devices',
]

BUSINESS_SCOPE_ENTITIES = {
    'businesses', 'users', 'business_roles', 'locations', 'registers', 'devices',
}

# Canonical permission required to push a tenant-management entity. A member
# must hold at least one of the listed keys; ``None`` means owner/admin only
# (business metadata/ownership). Mirrors what the mobile/desktop UIs gate.
ENTITY_PERMISSIONS = {
    'users': ('team.manage',),
    'business_roles': ('team.manage',),
    'devices': ('devices.manage', 'settings.manage'),
    'registers': ('registers.manage', 'settings.manage'),
    'locations': ('registers.manage', 'settings.manage'),
    'businesses': None,
}

MAX_CHANGES = 2000


class _AuthMixin(APIView):
    # Authentication is enforced inside authorize_device (supports both the JWT
    # customer-user path and the provisioned device-key path). DRF converts the
    # raised NotAuthenticated/AuthenticationFailed/PermissionDenied to 401/403.
    permission_classes = [AllowAny]

    # Cloud sync is a dedicated throttle scope (config `sync` rate) so an
    # authenticated hub busy-looping never starves the shared `anon`/`user`
    # budgets, and a flood of sync traffic is rate-limited independently.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'sync'

    def _authed(self, body=None):
        return authorize_device(self.request, body)

    def _bounded_seq(self, raw):
        """Parse a client change seq defensively (reject absurd values)."""
        try:
            seq = int(raw)
        except (TypeError, ValueError):
            raise ValidationError({'seq': 'invalid sequence'})
        if seq < 0 or seq > 9_999_999_999:  # ~2^33, far beyond realistic outbox counts
            raise ValidationError({'seq': 'sequence out of range'})
        return seq

    def _push_principal(self, authed):
        """Resolve the effective RBAC principal for a push.

        Ownership/permissions are decided by the *business-level* role of the
        device or the account's membership — never by platform and never by the
        transport (device-key vs JWT). A desktop cashier is a cashier; a mobile
        owner is an owner. Returns ``(level, permissions)``.

        Raises 403 when a logged-in account has no active membership for the
        tenant derived from its JWT.
        """
        return _device_principal(
            authed.business,
            authed.sync_device,
            authed.authed_user,
            via_device_key=authed.via_device_key,
        )

    def _authorize_entity_push(self, entity, level, permissions):
        required = ENTITY_PERMISSIONS.get(entity)
        if required is None:
            if entity not in BUSINESS_SCOPE_ENTITIES:
                return
            if level != 'owner':
                raise PermissionDenied(
                    f'{entity} changes require the business owner'
                )
            return
        if level == 'owner':
            return
        if not any(can(permissions, key) for key in required):
            raise PermissionDenied(
                'this member is not allowed to push {} changes'.format(entity)
            )


class SyncPushView(_AuthMixin):
    """POST /api/sync/push  { device_id, changes: [...] }"""

    def post(self, request):
        body = request.data or {}
        authed = self._authed(body)
        raw = request.data.get('changes') or []
        if not isinstance(raw, list):
            raise ValidationError({'changes': 'must be an array'})
        if len(raw) > MAX_CHANGES:
            raise ValidationError({'changes': f'max {MAX_CHANGES} changes per push'})

        device_id = authed.sync_device.device_id
        accepted = 0

        level, principal_permissions = self._push_principal(authed)

        with transaction.atomic():
            for change in raw:
                if not isinstance(change, dict):
                    raise ValidationError({'changes': 'each change must be an object'})
                entity = validate_entity(change.get('entity'))
                self._authorize_entity_push(entity, level, principal_permissions)
                entity_uuid = str(change.get('entity_uuid') or '')
                if not entity_uuid or len(entity_uuid) > 64 or ('<' in entity_uuid) or ('>' in entity_uuid):
                    raise ValidationError({'entity_uuid': 'invalid entity_uuid'})
                op = validate_op(change.get('op'))
                client_seq = self._bounded_seq(change.get('seq', change.get('client_seq')))
                payload = validate_payload(change.get('payload'))
                if payload is None:
                    payload = {}
                # Tenant scoping is server-derived (authed.business) — always.
                _, created = SyncRecord.objects.get_or_create(
                    business=authed.business,
                    device=authed.sync_device,
                    client_seq=client_seq,
                    defaults={
                        'entity': entity,
                        'entity_uuid': entity_uuid,
                        'op': op,
                        'payload': payload,
                        'checksum': str(change.get('checksum') or ''),
                    },
                )
                if created:
                    accepted += 1

        last_seq = SyncRecord.objects.filter(business=authed.business).order_by('-id').values_list('id', flat=True).first() or 0
        return Response({'ok': True, 'accepted': accepted, 'last_remote_seq': last_seq, 'lastSeq': last_seq})


class SyncPullView(_AuthMixin):
    """GET /api/sync/pull?device=<id>&since=<seq>"""

    def get(self, request):
        device_id = request.query_params.get('device') or request.headers.get('X-Device-Id') or ''
        authed = self._authed({'device_id': device_id})
        try:
            since = int(request.query_params.get('since') or 0)
        except ValueError:
            since = 0

        qs = (
            SyncRecord.objects
            .filter(business=authed.business, id__gt=since)
            .select_related('device')
            .exclude(device=authed.sync_device)  # other branches only
            .order_by('id')
        )

        # If a full re-snapshot is requested, serve the whole tenant log.
        if since <= 0:
            qs = SyncRecord.objects.filter(business=authed.business).select_related('device').order_by('id')

        records = list(qs)
        records.sort(key=lambda r: (APPLY_ORDER.index(r.entity) if r.entity in APPLY_ORDER else 99, r.id))

        changes = []
        for r in records[:MAX_CHANGES]:
            changes.append({
                'entity': r.entity,
                'entity_uuid': r.entity_uuid,
                'op': r.op,
                'payload': r.payload,
                'device_id': r.device.device_id,
                'checksum': r.checksum,
                'seq': r.id,
            })

        last_seq = SyncRecord.objects.filter(business=authed.business).order_by('-id').values_list('id', flat=True).first() or 0
        return Response({'ok': True, 'changes': changes, 'lastSeq': last_seq})


class SyncStatusView(_AuthMixin):
    """GET /api/sync/status — current device status for §17/§18 enforcement."""

    def get(self, request):
        device_id = request.query_params.get('device') or request.headers.get('X-Device-Id') or ''
        authed = self._authed({'device_id': device_id})
        return Response({
            'ok': True,
            'device_id': authed.sync_device.device_id,
            'status': authed.sync_device.status,
            'name': authed.sync_device.device_name,
            'blocked': authed.sync_device.blocked,
            'license_status': authed.license.status if authed.license else None,
        })


class SyncDeviceRegisterView(_AuthMixin):
    """POST /api/sync/device/register  { device_id, device_name }"""

    def post(self, request):
        body = request.data or {}
        authed = self._authed(body)
        name = validate_device_name(body.get('device_name'))
        # Explicit registration is idempotent for an already-authorized device,
        # but must never create a device beyond license capacity.
        if not SyncDevice.objects.filter(
            business=authed.business,
            device_id=authed.sync_device.device_id,
            is_active=True,
        ).exists():
            if authed.license.device_limit != 0 and SyncDevice.objects.filter(
                business=authed.business, is_active=True
            ).count() >= authed.license.device_limit:
                raise PermissionDenied('device capacity for this license is exhausted')
        dev, created = SyncDevice.objects.get_or_create(
            business=authed.business,
            device_id=authed.sync_device.device_id,
            defaults={
                'license': authed.license,
                'device_name': name,
                'is_active': True,
                'status': 'active',
            },
        )
        # Bind the registered device to the authenticated person when the caller
        # is a JWT account (a real user). In device-key mode there is no person
        # in the request, so we leave the binding as-is (already set at pairing
        # or auto-register time).
        if not authed.via_device_key and dev.user_id is None and getattr(authed.authed_user, 'id', None):
            dev.user = authed.authed_user
            dev.save(update_fields=['user'])
        return Response({'ok': True, 'created': created, 'device_id': dev.device_id, 'status': dev.status})


class SyncDeviceStatusView(_AuthMixin):
    """GET /api/sync/device/status?device=<id> — remote device roster status.

    Lets an owner/manager read/observe the cloud-delivered roster status of a
    given device (used by the desktop terminal to enforce §17/§18 through the
    cloud path even while it is the hub on LAN)."""

    def get(self, request):
        authed = self._authed({'device_id': request.query_params.get('device') or ''})
        target = request.query_params.get('target')
        if not target:
            return Response({'ok': True, 'status': authed.sync_device.status})
        target = validate_device_id(target)
        try:
            dev = SyncDevice.objects.select_related('user').get(business=authed.business, device_id=target)
            return Response({
                'ok': True,
                'device_id': dev.device_id,
                'status': dev.status,
                'name': dev.device_name,
                'blocked': dev.blocked,
                'platform': dev.platform,
                'bound_user_id': dev.user_id,
                'bound_user_name': dev.user.username if dev.user_id else None,
            })
        except SyncDevice.DoesNotExist:
            return Response({'ok': True, 'device_id': target, 'status': None, 'blocked': False})


def _device_data(dev):
    """Shared device-management payload (roster row for the employees/devices UI)."""
    from django.utils import timezone
    return {
        'id': dev.id,
        'device_id': dev.device_id,
        'device_name': dev.device_name,
        'platform': dev.platform,
        'status': dev.status,
        'is_active': dev.is_active,
        'role_key': dev.role_key,
        'bound_user_id': dev.user_id,
        'bound_user_name': dev.user.username if dev.user_id else None,
        'last_seen': dev.last_seen.isoformat() if dev.last_seen else None,
        'created_at': dev.created_at.isoformat() if dev.created_at else None,
        'updated_at': dev.updated_at.isoformat() if dev.updated_at else None,
    }


class SyncDeviceListView(_AuthMixin):
    """GET /api/sync/devices/ — the business's authorized device roster.

    Owner/manager only. Returns every SyncDevice for the tenant with its bound
    person (user), platform, status and recency — the data backing the
    "Employees & Devices" management screen on both desktop and mobile. Auth is
    the account-level path (like the pairing list): a customer or an
    active team.manage member of the tenant.
    """

    permission_classes = (IsAuthenticated,)

    def get(self, request):
        business = _current_business(request.user)
        if not business or not _can_manage_members(request.user, business):
            raise PermissionDenied('only the owner or a team.manage member may list devices')
        devices = SyncDevice.objects.filter(business=business).select_related('user').order_by('id')
        return Response({'devices': [_device_data(d) for d in devices]})


class SyncDeviceManageView(_AuthMixin):
    """GET/PATCH/DELETE /api/sync/device/<id>/ — manage one roster device.

    Owner/manager only. PATCH lets the owner rename a device or change its
    status (active/locked/disabled/removed) — per-device revocation that never
    affects the bound user or their other devices. DELETE performs a soft
    "remove" (row kept for audit; sync blocked via is_active=False), so sync
    history and the user's remaining devices are untouched.
    """

    STATUS_TRANSITIONS = ('active', 'locked', 'disabled', 'removed')

    def _get(self, request, pk):
        business = _current_business(request.user)
        if not business:
            raise PermissionDenied('only the owner or a team.manage member may manage devices')
        try:
            return SyncDevice.objects.select_related('user').get(pk=pk, business=business)
        except SyncDevice.DoesNotExist:
            raise ValidationError({'detail': 'device not found in this business'})

    def get(self, request, pk):
        if not _can_manage_members(request.user, _current_business(request.user)):
            raise PermissionDenied('only the owner or a team.manage member may manage devices')
        return Response(_device_data(self._get(request, pk)))

    def patch(self, request, pk):
        business = _current_business(request.user)
        if not business or not _can_manage_members(request.user, business):
            raise PermissionDenied('only the owner or a team.manage member may manage devices')
        dev = self._get(request, pk)
        body = request.data or {}
        status_value = body.get('status')
        if status_value is not None:
            if status_value not in self.STATUS_TRANSITIONS:
                raise ValidationError({'status': 'invalid device status'})
            if status_value == 'active' and device_at_capacity(business, _find_active_license(business)):
                raise ValidationError({
                    'detail': 'This business has reached its device limit.',
                    'reason': 'device_limit',
                })
            dev.status = status_value
            dev.is_active = status_value == 'active'
        name = body.get('device_name')
        if name is not None:
            dev.device_name = validate_device_name(name)
        if 'status' not in body and 'device_name' not in body:
            raise ValidationError({'detail': 'nothing to update'})
        dev.save()
        return Response(_device_data(dev))

    def delete(self, request, pk):
        if not _can_manage_members(request.user, _current_business(request.user)):
            raise PermissionDenied('only the owner or a team.manage member may manage devices')
        dev = self._get(request, pk)
        dev.status = 'removed'
        dev.is_active = False
        dev.save(update_fields=['status', 'is_active'])
        return Response({'ok': True, 'id': dev.id, 'status': dev.status})


def device_at_capacity(business, lic):
    """True when this business's active device count has reached its license cap.

    A missing/inactive license means nothing may be activated (treat as full)."""
    if lic is None or lic.device_limit == 0:
        return lic is None
    active = SyncDevice.objects.filter(business=business, is_active=True).count()
    return active >= lic.device_limit


class AuditChainCommitView(_AuthMixin):
    """POST /api/sync/audit-chain/commit  { device_id, record_count, head_hash, records }

    The desktop hub submits its locally-verified audit chain state (§32). The
    backend stores it as the tamper-evidence root of trust for the business and
    immediately recomputes/verifies continuity, count and head-hash. ``records``
    is the ordered ``[{seq, prev_hash, hash}, ...]`` list the hub derives from
    its own ``verifyAuditChain()``.
    """

    def post(self, request):
        body = request.data or {}
        authed = self._authed(body)
        record_count = body.get('record_count')
        head_hash = body.get('head_hash')
        records = body.get('records')

        if not isinstance(record_count, int) or record_count < 0:
            raise ValidationError({'record_count': 'must be a non-negative integer'})
        if not isinstance(head_hash, str) or not head_hash or len(head_hash) > 64:
            raise ValidationError({'head_hash': 'must be a SHA-256 hex digest'})
        if not isinstance(records, list):
            raise ValidationError({'records': 'must be an array'})
        if len(records) > 2_000_000:
            raise ValidationError({'records': 'too many records'})

        try:
            result = submit_audit_chain(
                authed.business,
                authed.sync_device,
                record_count,
                head_hash,
                records,
            )
        except ValueError as e:
            raise ValidationError({'records': str(e)})

        verification = result['verification']
        return Response({
            'ok': True,
            'committed': True,
            'verification': verification,
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def audit_chain_verify_view(request, business_id):
    """GET /api/sync/audit-chain/verify/<business_id> (admin only)

    Verifies the tamper-evidence anchor for one business's audit hash chain:
    chain continuity (each ``prev_hash`` matches the previous record's ``hash``,
    starting at GENESIS), record count, and head-hash agreement against the
    latest committed state. Returns 200 with the verification report (including
    the first broken seq, or a clear ``ok`` when the chain is intact).
    """
    # business_id is an accounts.User primary key (a customer business).
    verification = verify_business_audit_chain(business_id)
    return Response({
        'ok': True,
        'business_id': business_id,
        **verification,
    })
