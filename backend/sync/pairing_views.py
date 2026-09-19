"""Employee QR pairing flow (backend, authoritative).

Owner/Manager issues a short-lived single-use invitation → employee looks it up
(scan/enter code), confirms the assignment preview, and accepts → a **pending**
SyncDevice + pending BusinessMembership are created → Owner/Manager approves or
rejects. Pending state blocks sync; only approval activates the device and the
membership. Nothing in the employee's request is trusted for role/permission —
those are fixed at issue time by the inviter.

Reuses the existing sync auth chain (``authorize_device``), membership gating
(``_can_manage_members``), device status/blocking semantics, and the RBAC mirror
``accounts/rbac``. No parallel auth system is introduced.
"""

from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import BusinessMembership, User
from accounts.views import _can_manage_members
from licenses.models import License

from .authorization import _device_capacity_ok, _find_active_license
from .models import PairingInvitation, SyncDevice
from .security import (
    generate_device_key,
    generate_pairing_code,
    generate_pairing_token,
    hash_device_key,
    hash_pairing_token,
    validate_device_id,
    validate_device_name,
)

PAIRING_TTL_MINUTES = 10
MAX_INVITES_PER_BUSINESS = 50


def _current_business(user):
    """The tenant an authenticated user operates (owner id or first membership)."""
    if getattr(user, 'is_customer', False):
        return user
    membership = BusinessMembership.objects.filter(
        user=user, is_active=True
    ).select_related('business').first()
    return membership.business if membership else None


def _resolve_invite(token=None, code=None):
    """Find an invitation by one-time QR ``token`` OR 6-digit manual ``code``."""
    if token:
        return PairingInvitation.objects.filter(
            token_hash=hash_pairing_token(str(token).strip())
        ).select_related('business', 'used_by', 'device').first()
    if code:
        return PairingInvitation.objects.filter(
            code=str(code).strip()
        ).select_related('business', 'used_by', 'device').first()
    return None


def _invite_data(invite):
    return {
        'id': invite.id,
        'employee_name': invite.employee_name,
        'role': invite.role,
        'register': invite.register,
        'location': invite.location,
        'status': invite.status,
        'expires_at': invite.expires_at.isoformat(),
        'created_at': invite.created_at.isoformat(),
        'business_id': invite.business_id,
        'accepted_by': invite.used_by.username if invite.used_by else None,
        'device_id': invite.device.device_id if invite.device_id else None,
        'device_status': invite.device.status if invite.device_id else None,
        'bound_user_id': invite.device.user_id if invite.device_id else None,
        'bound_user_name': (invite.device.user.username if invite.device_id and invite.device.user else None),
    }


class PairingInviteView(APIView):
    """POST /api/sync/pairing/invite — issue a temporary join invitation.

    Owner/Manager only (role is fixed server-side). Returns the raw token once
    for QR/code display; only its hash is stored.

    Supports any device platform: mobile, desktop, or unknown. The joining
    device's platform is recorded but does not affect permissions — roles
    and permissions belong to the user's business membership, not the device type.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        business = _current_business(request.user)
        if not business or not getattr(business, 'is_customer', False):
            raise PermissionDenied('account has no business')
        if not _can_manage_members(request.user, business):
            raise PermissionDenied(
                'only the business owner or a member with team.manage may invite employees'
            )

        employee_name = str(request.data.get('employee_name') or '').strip()[:255]
        role = str(request.data.get('role') or 'cashier').lower().strip()
        valid_roles = {c[0] for c in BusinessMembership.Role.choices} - {'owner'}
        if role not in valid_roles:
            raise ValidationError({'role': 'invalid role'})
        permissions_override = request.data.get('permissions')
        if permissions_override is not None and not isinstance(permissions_override, dict):
            raise ValidationError({'permissions': 'must be an object'})
        register = str(request.data.get('register') or '').strip()[:120]
        location = str(request.data.get('location') or '').strip()[:120]
        platform = str(request.data.get('platform') or 'mobile').lower().strip()
        if platform not in ('mobile', 'desktop'):
            platform = 'mobile'  # default for backward compat

        if PairingInvitation.objects.filter(
            business=business,
            status='pending',
            created_at__gt=timezone.now() - timezone.timedelta(hours=24),
        ).count() >= MAX_INVITES_PER_BUSINESS:
            raise ValidationError({'detail': 'too many active invitations'})

        token = generate_pairing_token()
        code = generate_pairing_code()
        invite = PairingInvitation.objects.create(
            business=business,
            inviter=request.user,
            token_hash=hash_pairing_token(token),
            code=code,
            employee_name=employee_name,
            role=role,
            permissions=permissions_override or {},
            register=register,
            location=location,
            expires_at=timezone.now() + timezone.timedelta(minutes=PAIRING_TTL_MINUTES),
        )
        return Response({
            'id': invite.id,
            'token': token,
            'code': code,
            'qr_uri': f'shega://join?t={token}',
            'business_name': business.business_name or business.username,
            'business_id': business.id,
            'employee_name': invite.employee_name,
            'role': invite.role,
            'register': invite.register,
            'location': invite.location,
            'platform': platform,
            'expires_at': invite.expires_at.isoformat(),
        }, status=status.HTTP_201_CREATED)


class PairingListView(APIView):
    """GET /api/sync/pairing/ — invitations + pending requests for a business."""

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        business = _current_business(request.user)
        if not business or not _can_manage_members(request.user, business):
            raise PermissionDenied('not allowed to view pairing requests')
        invites = PairingInvitation.objects.filter(business=business)
        return Response({'invitations': [_invite_data(i) for i in invites]})


class PairingRevokeView(APIView):
    """POST /api/sync/pairing/<id>/revoke — cancel a pending invitation."""

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk):
        invite = self._get(request, pk)
        if not _can_manage_members(request.user, invite.business):
            raise PermissionDenied('not allowed to revoke pairing requests')
        if invite.status != 'pending' or invite.expired:
            raise ValidationError({'detail': 'invitation is no longer pending'})
        invite.status = 'cancelled'
        invite.save(update_fields=['status'])
        return Response({'ok': True, 'id': invite.id, 'status': invite.status})

    def _get(self, request, pk):
        try:
            return PairingInvitation.objects.select_related('business', 'used_by', 'device').get(pk=pk)
        except PairingInvitation.DoesNotExist:
            raise NotFound('invitation not found')


class PairingLookupView(APIView):
    """POST /api/sync/pairing/lookup — resolve a token OR 6-digit code.

    Deliberately unauthenticated: the token/code itself is the secret. Returns
    the assignment preview (business name, role, register, location) so the
    employee can confirm before accepting. Never consumes the invitation.
    """

    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        token = str(request.data.get('token') or '').strip()
        code = str(request.data.get('code') or '').strip()
        if not token and not code:
            raise ValidationError({'token': 'token or code is required'})
        invite = _resolve_invite(token=token or None, code=code or None)
        if not invite:
            raise NotFound('invitation not found')
        if invite.status == 'used':
            raise ValidationError({'detail': 'invitation was already used', 'reason': 'used'})
        if invite.status in ('approved', 'rejected', 'revoked', 'cancelled'):
            raise ValidationError({'detail': 'invitation is no longer open', 'reason': invite.status})
        if invite.expired:
            invite.status = 'expired'
            invite.save(update_fields=['status'])
            raise ValidationError({'detail': 'invitation has expired', 'reason': 'expired'})
        return Response({
            'business_id': invite.business_id,
            'business_name': invite.business.business_name or invite.business.username,
            'employee_name': invite.employee_name,
            'role': invite.role,
            'register': invite.register,
            'location': invite.location,
            'expires_at': invite.expires_at.isoformat(),
        })


class PairingAcceptView(APIView):
    """POST /api/sync/pairing/accept — employee accepts a valid invitation.

    Authenticated (the employee needs an account to become a member). Consumes
    the single-use token atomically, creates a **pending** SyncDevice and a
    **pending** BusinessMembership carrying the inviter-fixed role/permissions.
    Does not activate anything — Owner/Manager approval does.
    """

    permission_classes = (permissions.IsAuthenticated,)

    @transaction.atomic
    def post(self, request):
        token = str(request.data.get('token') or '').strip()
        code = str(request.data.get('code') or '').strip()
        if not token and not code:
            raise ValidationError({'token': 'token or code is required'})
        device_id = validate_device_id(request.data.get('device_id'))
        device_name = validate_device_name(request.data.get('device_name'))
        platform = str(request.data.get('platform') or 'mobile').lower().strip()
        if platform not in ('mobile', 'desktop'):
            platform = 'mobile'

        invite = PairingInvitation.objects.select_for_update().filter(
            **({'token_hash': hash_pairing_token(token)} if token else {'code': code})
        ).select_related('business').first()
        if not invite:
            raise NotFound('invitation not found')
        if invite.status == 'used':
            raise ValidationError({'detail': 'invitation was already used', 'reason': 'used'})
        if invite.status in ('approved', 'rejected', 'revoked', 'cancelled'):
            raise ValidationError({'detail': 'invitation is no longer open', 'reason': invite.status})
        if invite.expired:
            invite.status = 'expired'
            invite.save(update_fields=['status'])
            raise ValidationError({'detail': 'invitation has expired', 'reason': 'expired'})
        if invite.business_id == request.user.id:
            raise ValidationError({'detail': 'the business owner cannot join their own business'})

        if not invite.consume(request.user):
            raise ValidationError({'detail': 'invitation could not be used', 'reason': 'used'})

        # Subscription / device-capacity check (spec §20): the business must have
        # an active license and room for another device before we even create a
        # pending pairing request. Server-side only — the client never declares
        # its own capacity.
        license_obj = _find_active_license(invite.business)
        if license_obj is None:
            raise ValidationError({'detail': 'This business has no active subscription yet.'})
        if not _device_capacity_ok(invite.business, license_obj):
            raise ValidationError({
                'detail': 'This business has reached its device limit. No more devices can be paired.',
                'reason': 'device_limit',
            })

        # Existing membership handling: never escalate/re-add an active member.
        membership = BusinessMembership.objects.filter(
            user=request.user, business=invite.business
        ).first()
        if membership and membership.status == 'active':
            # Same-user multi-device path: the user is already a member and is
            # pairing ANOTHER device. Keep their active membership untouched and
            # just register the new device below as pending (owner approval
            # still gates it). We never downgrade or re-pend an active member.
            pass
        elif membership:
            membership.role = invite.role
            membership.permissions = invite.permissions or {}
            membership.status = 'pending'
            membership.invited_by = invite.inviter
            membership.save()
        else:
            membership = BusinessMembership.objects.create(
                user=request.user,
                business=invite.business,
                role=invite.role,
                permissions=invite.permissions or {},
                status='pending',
                invited_by=invite.inviter,
            )

        # Pending device: not ready for sync until approved.
        # Device type (mobile/desktop) is recorded but does not affect permissions.
        device, created = SyncDevice.objects.get_or_create(
            business=invite.business,
            device_id=device_id,
            defaults={
                'license': license_obj,
                'device_name': device_name,
                'platform': platform,
                'status': 'pending',
                'role_key': invite.role,
                'is_active': False,
                # Bind the paired device to the joining employee so all of that
                # person's devices (mobile + later desktop) point at the same
                # account and membership — not a per-device employee identity.
                'user': request.user,
            },
        )
        if not created:
            if device.status == 'active':
                return Response({
                    'received': True,
                    'status': 'active',
                    'detail': 'This device is already active on the business.',
                })
            device.status = 'pending'
            device.role_key = invite.role
            device.platform = platform
            device.is_active = False
            device.user = request.user
            device.save(update_fields=['status', 'role_key', 'platform', 'is_active', 'user'])

        # Issue the device key exactly once. The raw key rides in THIS response
        # only (the joiner's desktop needs it for the device-key cloud transport);
        # only the PBKDF2 hash is stored. It is inert while the device is
        # pending/disabled (authorization refuses non-active rows).
        issued_key: str | None = None
        if created or not device.secret_hash:
            key = generate_device_key()
            device.secret_hash = hash_device_key(key)
            device.license = license_obj
            device.save(update_fields=['secret_hash', 'license'])
            issued_key = key

        invite.device = device
        invite.save(update_fields=['device'])

        return Response({
            'received': True,
            'status': 'pending',
            'detail': 'Pairing request submitted. Your Owner will approve your device before it becomes active.',
            'device_id': device.device_id,
            'invitation_id': invite.id,
            'device_key': issued_key,
        }, status=status.HTTP_202_ACCEPTED)


class PairingStatusView(APIView):
    """GET /api/sync/pairing/status/<id> — the acceptant polls their own status.

    Visible only to the employee who accepted (via ``used_by``), or to a
    manager. Returns the invitation status plus the paired device status so the
    joiner can reflect approval/rejection without list access.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, pk):
        try:
            invite = PairingInvitation.objects.select_related(
                'business', 'used_by', 'device'
            ).get(pk=pk)
        except PairingInvitation.DoesNotExist:
            raise NotFound('invitation not found')
        if invite.used_by_id != request.user.id and not _can_manage_members(
            request.user, invite.business
        ):
            raise PermissionDenied('not allowed to view this pairing status')
        return Response({
            'id': invite.id,
            'status': invite.status,
            'device_status': invite.device.status if invite.device_id else None,
            'role': invite.role,
            'business_name': invite.business.business_name or invite.business.username,
            'business_id': invite.business_id,
            'employee_name': invite.employee_name,
            'register': invite.register,
            'location': invite.location,
        })


class PairingDecisionView(APIView):
    """POST /api/sync/pairing/<id>/approve|/reject — Owner/Manager decides."""

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk, decision):
        try:
            invite = PairingInvitation.objects.select_related(
                'business', 'used_by', 'device'
            ).get(pk=pk)
        except PairingInvitation.DoesNotExist:
            raise NotFound('invitation not found')
        if not _can_manage_members(request.user, invite.business):
            raise PermissionDenied('only the business owner or a team.manage member may decide')
        if invite.status != 'used' or not invite.used_by:
            raise ValidationError({'detail': 'nobody has accepted this invitation yet'})

        # Approval-time role assignment (spec §7): the deciding Owner picks the
        # final role when approving — Owner / Cashier / Custom with explicit
        # permission overrides. Defaults to the inviter-fixed invite.role. The
        # joiner can never self-assign a role: this only runs for approvers.
        override_role = str(request.data.get('role') or '').lower().strip()
        override_permissions = request.data.get('permissions')
        if override_role:
            from accounts.models import BusinessMembership
            valid_roles = {c[0] for c in BusinessMembership.Role.choices}
            if override_role not in valid_roles:
                raise ValidationError({'role': 'invalid role'})

        membership = BusinessMembership.objects.filter(
            user=invite.used_by, business=invite.business
        ).first()

        if decision == 'approve':
            # §20 re-check: the business must still have capacity before the
            # pending device is activated (the limit may have shrunk since issue).
            lic = _find_active_license(invite.business)
            if lic is None or not _device_capacity_ok(invite.business, lic):
                raise ValidationError({
                    'detail': 'This business has reached its device limit. Approval denied.',
                    'reason': 'device_limit',
                })
            if invite.device_id:
                device = invite.device
                device.status = 'active'
                device.is_active = True
                if override_role:
                    device.role_key = override_role
                device.save(update_fields=['status', 'is_active', 'role_key'])
            if membership:
                membership.status = 'active'
                if override_role:
                    membership.role = override_role
                if override_role == 'custom' and isinstance(override_permissions, dict):
                    membership.permissions = override_permissions
                elif override_role == 'owner':
                    # Equal multi-owner: granting Owner carries the full owner
                    # permission set, same as an owner created on any device.
                    from accounts.rbac import PERMISSIONS_BY_ROLE
                    membership.permissions = dict(PERMISSIONS_BY_ROLE.get('owner', {}))
                membership.is_active = True
                membership.save(update_fields=['status', 'role', 'permissions', 'is_active'])
            invite.status = 'approved'
            invite.role = override_role or invite.role
            invite.save(update_fields=['status', 'role'])
            return Response({'ok': True, 'status': 'approved'})
        if decision == 'reject':
            if invite.device_id:
                device = invite.device
                device.status = 'disabled'
                device.is_active = False
                device.save(update_fields=['status', 'is_active'])
            if membership:
                membership.status = 'disabled'
                membership.save(update_fields=['status', 'is_active'])
            invite.status = 'rejected'
            invite.save(update_fields=['status'])
            return Response({'ok': True, 'status': 'rejected'})
        raise NotFound('unknown decision')


class PairingMyView(APIView):
    """GET /api/sync/pairing/mine — the authenticated user's own pairing requests.

    Resume hook for both Mobile and Desktop joiners: the pairing request lives
    server-side and survives app restart, so after re-authentication the client
    asks for "requests involving me" instead of relying on in-memory state. The
    caller picks the newest non-expired ``pending``/``used`` request to resume
    waiting, an ``approved`` one to finish activation, a ``rejected`` one to
    show the rejection, or an ``expired`` one to prompt for a fresh invitation.

    The one-time code is never rotated or re-issued here — a request resumes on
    its original (still single-use) request record.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        invites = list(
            PairingInvitation.objects.filter(used_by=request.user)
            .select_related('business', 'device', 'device__user')
            .order_by('-created_at')[:50]
        )
        items = []
        for invite in invites:
            # Lazily surface expired pending invites so the joiner sees the
            # honest state instead of an eternal "waiting" screen.
            if invite.status == 'pending' and invite.expired:
                invite.status = 'expired'
                invite.save(update_fields=['status'])
            data = _invite_data(invite)
            data['business_name'] = invite.business.business_name or invite.business.username
            data['device_name'] = invite.device.device_name if invite.device_id else None
            data['platform'] = invite.device.platform if invite.device_id else None
            data['expired'] = invite.expired
            data['used_at'] = invite.used_at.isoformat() if invite.used_at else None
            data['resumable'] = (
                invite.status in ('pending', 'used') and not invite.expired
            )
            items.append(data)
        return Response({'pairing_requests': items})