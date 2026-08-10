from datetime import timedelta
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from licenses.models import License, DeviceActivation, LicensePlan
from licenses.utils import check_device_limit

from .permissions import PublicEndpoint
from .serializers import (
    VerifyLicenseSerializer,
    ActivateDeviceSerializer,
    DeactivateDeviceSerializer,
    RenewLicenseSerializer,
    LicenseStatusSerializer,
)
from .throttles import LicenseVerifyThrottle


class VerifyLicenseView(APIView):
    permission_classes = [PublicEndpoint]
    throttle_classes = [LicenseVerifyThrottle]

    def post(self, request):
        serializer = VerifyLicenseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        license_key = serializer.validated_data.get('license_key') or getattr(
            request.user, 'license_key', None
        )

        # Support the mobile flow: an authenticated user without an explicit key
        # verifies their own most recent license.
        if not license_key and request.user.is_authenticated:
            license = License.objects.filter(
                customer=request.user
            ).select_related('plan').first()
            if license is None:
                return Response(
                    {'valid': False, 'message': 'No license found for this account.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            if not license_key:
                return Response(
                    {'valid': False, 'message': 'License key is required.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                license = License.objects.select_related('plan').get(
                    license_key=license_key,
                )
            except License.DoesNotExist:
                return Response(
                    {'valid': False, 'message': 'Invalid license key.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

        if license.status != 'active':
            return Response(
                {'valid': False, 'message': f'License is {license.status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if license.expiry_date < timezone.now().date():
            return Response(
                {'valid': False, 'message': 'License has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        device_id = serializer.validated_data.get('device_id')
        if not device_id:
            return Response({
                'valid': True,
                'license_key': license.license_key,
                'status': license.status,
                'expiry_date': license.expiry_date,
                'message': 'License is valid.',
            })

        device = license.device_activations.filter(device_id=device_id).first()

        if device and device.is_active:
            device.last_seen = timezone.now()
            device.save(update_fields=['last_seen'])
        elif device and not device.is_active:
            return Response(
                {'valid': False, 'message': 'Device is deactivated.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not device and not check_device_limit(license):
            return Response(
                {'valid': False, 'message': 'Device limit reached.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            'valid': True,
            'license_key': license.license_key,
            'status': license.status,
            'expiry_date': license.expiry_date,
            'message': 'License is valid.',
        })


class ActivateDeviceView(APIView):
    permission_classes = [PublicEndpoint]
    throttle_classes = [LicenseVerifyThrottle]

    def post(self, request):
        serializer = ActivateDeviceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            license = License.objects.get(
                license_key=serializer.validated_data['license_key'],
            )
        except License.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Invalid license key.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if license.status != 'active':
            return Response(
                {'success': False, 'message': f'License is {license.status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if license.expiry_date < timezone.now().date():
            return Response(
                {'success': False, 'message': 'License has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        device_id = serializer.validated_data['device_id']

        existing = license.device_activations.filter(device_id=device_id).first()

        if existing and existing.is_active:
            existing.last_seen = timezone.now()
            existing.device_name = serializer.validated_data.get('device_name', existing.device_name)
            existing.operating_system = serializer.validated_data.get(
                'operating_system', existing.operating_system,
            )
            existing.save(update_fields=['last_seen', 'device_name', 'operating_system'])
            return Response({
                'success': True,
                'message': 'Device already active.',
                'device_id': existing.device_id,
                'activated_at': existing.activation_date,
            })

        if not check_device_limit(license):
            return Response(
                {'success': False, 'message': 'Device limit reached.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        device, _ = DeviceActivation.objects.update_or_create(
            license=license,
            device_id=device_id,
            defaults={
                'device_name': serializer.validated_data.get('device_name', ''),
                'operating_system': serializer.validated_data.get('operating_system', ''),
                'ip_address': request.META.get('REMOTE_ADDR', '0.0.0.0'),
                'last_seen': timezone.now(),
                'is_active': True,
            },
        )

        return Response({
            'success': True,
            'message': 'Device activated successfully.',
            'device_id': device.device_id,
            'activated_at': device.activation_date,
        })


class DeactivateDeviceView(APIView):
    permission_classes = [PublicEndpoint]
    throttle_classes = [LicenseVerifyThrottle]

    def post(self, request):
        serializer = DeactivateDeviceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            license = License.objects.get(
                license_key=serializer.validated_data['license_key'],
            )
        except License.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Invalid license key.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        device = license.device_activations.filter(
            device_id=serializer.validated_data['device_id'],
        ).first()

        if not device:
            return Response(
                {'success': False, 'message': 'Device not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not device.is_active:
            return Response(
                {'success': True, 'message': 'Device was already deactivated.'},
            )

        device.is_active = False
        device.last_seen = timezone.now()
        device.save(update_fields=['is_active', 'last_seen'])

        return Response({
            'success': True,
            'message': 'Device deactivated successfully.',
        })


class RenewLicenseView(APIView):
    permission_classes = [PublicEndpoint]
    throttle_classes = [LicenseVerifyThrottle]

    def post(self, request):
        serializer = RenewLicenseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            license = License.objects.get(
                license_key=serializer.validated_data['license_key'],
            )
        except License.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Invalid license key.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if license.status == 'revoked':
            return Response(
                {'success': False, 'message': 'Cannot renew a revoked license.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        duration_days = license.plan.duration_months * 30
        new_expiry = timezone.now().date() + timedelta(days=duration_days)
        license.expiry_date = new_expiry
        license.status = 'active'
        license.save(update_fields=['expiry_date', 'status'])

        return Response({
            'success': True,
            'message': 'License renewed successfully.',
            'new_expiry_date': new_expiry,
            'payment_reference': serializer.validated_data['payment_reference'],
        })


class LicenseStatusView(APIView):
    permission_classes = [PublicEndpoint]
    throttle_classes = [LicenseVerifyThrottle]

    def get(self, request):
        serializer = LicenseStatusSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        license_key = serializer.validated_data.get('license_key') or ''

        qs = License.objects.select_related('plan')
        if license_key:
            try:
                license = qs.get(license_key=license_key)
            except License.DoesNotExist:
                return Response(
                    {'valid': False, 'message': 'Invalid license key.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
        elif request.user.is_authenticated:
            license = qs.filter(customer=request.user).order_by('-created_at').first()
            if license is None:
                return Response(
                    {'valid': False, 'plan': None, 'expires_at': None,
                     'license_key': None, 'reason': 'No license found for this account.'},
                    status=status.HTTP_200_OK,
                )
        else:
            return Response(
                {'valid': False, 'message': 'License key is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        active_devices = license.device_activations.filter(is_active=True)
        devices = [{
            'device_id': d.device_id,
            'device_name': d.device_name,
            'operating_system': d.operating_system,
            'last_seen': d.last_seen,
            'activated_at': d.activation_date,
        } for d in active_devices]

        return Response({
            'valid': license.status == 'active' and license.expiry_date > timezone.now().date(),
            'plan': license.plan.name if license.plan else None,
            'expires_at': license.expiry_date,
            'license_key': license.license_key,
            'status': license.status,
            'expiry_date': license.expiry_date,
            'device_limit': license.device_limit,
            'active_devices_count': active_devices.count(),
            'active_devices': devices,
            'created_at': license.created_at,
        })


class PlansListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        plans = LicensePlan.objects.filter(is_active=True)
        data = [{
            'id': p.id,
            'name': p.name.lower(),
            'display_name': p.name,
            'price': float(p.price),
            'duration_months': p.duration_months,
            'features': [
                f'{p.duration_months} month subscription',
                'Unlimited access to all features',
            ],
            'description': p.name,
        } for p in plans]
        return Response(data)


class SubscriptionStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from payments.models import Payment

        # A pending payment means an upgrade/renewal is awaiting admin
        # approval. Report it BEFORE the current license so the user is told
        # "pending approval" for their new plan instead of their old one.
        pending = (
            Payment.objects.select_related('plan')
            .filter(customer=request.user, status='pending')
            .order_by('-created_at')
            .first()
        )
        if pending is not None:
            return Response({
                'plan': pending.plan.name if pending.plan else None,
                'plan_name': pending.plan.name if pending.plan else None,
                'status': 'pending',
                'expires_at': None,
                'started_at': None,
                'license_key': None,
            })

        license = (
            License.objects.select_related('plan')
            .filter(customer=request.user)
            .order_by('-created_at')
            .first()
        )
        if license is not None:
            expires_at = license.expiry_date or None
            started_at = license.start_date or None
            plan_name = license.plan.name if license.plan else None
            today = timezone.now().date()
            # Guard against a NULL expiry_date: comparing None to a date raises
            # TypeError and 500s the whole endpoint. Treat a NULL expiry as
            # "unknown" and fall through to the status-based default instead of
            # crashing.
            if license.status == 'active' and license.expiry_date and license.expiry_date >= today:
                subscription_status = 'active'
            elif license.expiry_date and license.status in ('active', 'suspended') and license.expiry_date < today:
                subscription_status = 'expired'
            elif license.status in ('expired', 'revoked', 'suspended'):
                subscription_status = 'expired'
            else:
                subscription_status = 'active'
            return Response({
                'plan': plan_name,
                'plan_name': plan_name,
                'status': subscription_status,
                'expires_at': expires_at,
                'started_at': started_at,
                'license_key': license.license_key,
            })

        return Response({
            'plan': None,
            'plan_name': None,
            'status': 'none',
            'expires_at': None,
            'started_at': None,
            'license_key': None,
        })


# ---------------------------------------------------------------------------
# GitHub releases proxy
# ---------------------------------------------------------------------------
# The marketing site is a statically-built Next.js app on Vercel, so it cannot
# hold a secret. It fetches release info from the (private) shega-mobile repo
# through this endpoint instead, which authenticates to GitHub using a
# fine-grained PAT stored in the GITHUB_TOKEN env var on the server. The
# response body is passed through verbatim — it matches the shape the frontend
# already expects from githubRelease.ts.
#
# Responses are cached server-side for GITHUB_CACHE_TTL so a burst of visitors
# does not burn the GitHub API quota.


import json
import urllib.error
import urllib.request
from django.conf import settings
from django.core.cache import cache
from rest_framework.permissions import AllowAny

from .throttles import GithubProxyThrottle


GITHUB_API_BASE = "https://api.github.com/repos"
GITHUB_CACHE_TTL = 600  # 10 minutes


def _github_request(api_path: str):
    """Fetch a GitHub API path using the configured token + cache.

    Returns the parsed JSON. Raises ``urllib.error.HTTPError`` for non-2xx
    responses (callers translate into an HTTP response).
    """
    owner = getattr(settings, "GITHUB_OWNER", "nat2132")
    repo = getattr(settings, "GITHUB_REPO", "shega-mobile")
    token = getattr(settings, "GITHUB_TOKEN", None)
    url = f"{GITHUB_API_BASE}/{owner}/{repo}{api_path}"

    cache_key = f"github_proxy:{url}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "shega-website",
            **({"Authorization": f"Bearer {token}"} if token else {}),
        },
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=15) as response:
        raw = response.read().decode("utf-8")

    data = json.loads(raw) if raw else None
    cache.set(cache_key, data, GITHUB_CACHE_TTL)
    return data


class GithubReleaseProxyView(APIView):
    """Latest GitHub release JSON (mirrors /repos/{o}/{r}/releases/latest)."""

    permission_classes = [AllowAny]
    throttle_classes = [GithubProxyThrottle]

    def get(self, request):
        try:
            data = _github_request("/releases/latest")
        except urllib.error.HTTPError as exc:
            return Response(
                {"detail": "Release not found." if exc.code == 404 else "GitHub API error."},
                status=exc.code if exc.code in (404, 403, 429) else 502,
            )
        except urllib.error.URLError:
            return Response({"detail": "GitHub API unreachable."}, status=502)
        return Response(data)


class GithubReleaseListView(APIView):
    """Recent releases JSON (mirrors /repos/{o}/{r}/releases?per_page=...)."""

    permission_classes = [AllowAny]
    throttle_classes = [GithubProxyThrottle]

    def get(self, request):
        limit = min(max(int(request.GET.get("limit", 5) or 5), 1), 20)
        try:
            data = _github_request(f"/releases?per_page={limit}")
        except urllib.error.HTTPError as exc:
            return Response(
                {"detail": "Releases not found." if exc.code == 404 else "GitHub API error."},
                status=exc.code if exc.code in (404, 403, 429) else 502,
            )
        except urllib.error.URLError:
            return Response({"detail": "GitHub API unreachable."}, status=502)
        return Response(data)
