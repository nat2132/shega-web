import logging

from django.conf import settings
from django.core.cache import cache
from rest_framework import status as http_status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .gateway import MorGatewaySeam
from .models import MorVerificationEvent
from .serializers import MorVerifyRequestSerializer, MorVerifyResponseSerializer
from .throttles import MorVerifyThrottle
from .verification import STATUS_UNAVAILABLE, STATUS_FAILED, tin_digest

logger = logging.getLogger('shega.security')

_CACHE_PREFIX = 'mor:verify:'


def _cache_key(identity: dict) -> str:
    return _CACHE_PREFIX + identity['digest']


def _cache_ttl() -> int:
    return int(getattr(settings, 'MOR_CACHE_SECONDS', 12 * 60 * 60))


class MorVerifyTinView(APIView):
    """Backend gateway endpoint for Ministry of Revenues TIN verification.

    Response uses the shared canonical protocol; ``status`` may only be
    ``verified`` when the configured MoR integration returned a real match.
    Holdings "Refresh from MoR" (``force``) bypasses the backend cache.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [MorVerifyThrottle]

    def post(self, request):
        serializer = MorVerifyRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tin = serializer.validated_data['tin']
        sub_tin = serializer.validated_data.get('sub_tin')
        force = serializer.validated_data.get('force', False)

        identity = {
            'tin': tin,
            'sub_tin': sub_tin,
            'digest': tin_digest(tin),
        }

        if not force:
            cached = cache.get(_cache_key(identity))
            if cached is not None:
                cached['source'] = 'backend'
                serialized = MorVerifyResponseSerializer(data=cached)
                serialized.is_valid(raise_exception=True)
                return Response(serialized.validated_data)

        result = MorGatewaySeam().verify(tin, sub_tin)

        payload = {
            'status': result.status,
            'tin': tin,
            'sub_tin': result.sub_tin,
            'taxpayer_name': result.taxpayer_name,
            'taxpayer_type': result.taxpayer_type,
            'registration': result.registration,
            'reference': result.reference,
            'verified_at': result.verified_at,
            'source': result.source,
            'reason': result.reason,
        }

        # Cache positive/negative/official answers with a TTL (the client keeps
        # its own copy too). Unavailable/failed transport answers are NOT cached
        # so a transient outage clears itself on the next try.
        if result.status not in (STATUS_UNAVAILABLE, STATUS_FAILED):
            cache.set(_cache_key(identity), dict(payload), timeout=_cache_ttl())

        # Audit trail (masked only, live calls only).
        try:
            MorVerificationEvent.objects.create(
                user=request.user if getattr(request.user, 'is_authenticated', False) else None,
                tin_digest=identity['digest'],
                tin_masked=identity['tin'][:2] + '***' + identity['tin'][-2:],
                sub_tin_masked=(identity['sub_tin'] or ''),
                status=result.status,
                source=result.source,
                reference=result.reference or '',
                reason=result.reason or '',
            )
        except Exception:  # pragma: no cover - audit must never break the API
            logger.exception('mor event log write failed')

        return Response(payload, status=http_status.HTTP_200_OK)