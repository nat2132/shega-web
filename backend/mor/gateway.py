"""Ministry of Revenues gateway seam (Section U).

This module is the ONLY place that talks to an official MoR endpoint. It is a
*controlled integration seam*:

- No MoR credential/API key ever lives in a client app. Credentials are read
  from server environment variables only (``MOR_*``).
- Nothing is scraped. If no official integration is configured, the gateway
  reports ``unavailable`` and clients surface "Verification unavailable" — a
  verification is never fabricated.
- Network failures become ``failed`` (MoR did not answer), never ``verified``.
- Responses are whitelisted through ``map_official_response`` so raw MoR data
  is never stored or echoed beyond the canonical fields.
"""
import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone

from django.conf import settings

from .verification import (
    STATUS_FAILED,
    STATUS_NOT_FOUND,
    STATUS_UNAVAILABLE,
    STATUS_VERIFIED,
)

logger = logging.getLogger('shega.security')


@dataclass
class MorGatewayResult:
    status: str
    tin: str
    sub_tin: str | None = None
    taxpayer_name: str | None = None
    taxpayer_type: str | None = None
    registration: dict | None = None
    reference: str | None = None
    verified_at: str | None = None
    source: str = 'mor'
    reason: str | None = None
    extra: dict = field(default_factory=dict)


class MorGatewaySeam:
    """Env-configured adapter; callers depend on this interface only."""

    def is_configured(self) -> bool:
        return bool(getattr(settings, 'MOR_API_BASE_URL', None))

    def _base_url(self) -> str:
        return str(getattr(settings, 'MOR_API_BASE_URL', '')).rstrip('/')

    def verify(self, tin: str, sub_tin: str | None = None) -> MorGatewayResult:
        """Ask the official MoR integration for ``tin``.

        Returns ``unavailable`` when no official integration is configured and
        ``failed`` when the transport errors. ``verified`` is returned ONLY when
        the configured official endpoint answers success.
        """
        if not self.is_configured():
            return MorGatewayResult(
                status=STATUS_UNAVAILABLE,
                tin=tin,
                sub_tin=sub_tin,
                reason='mor_integration_not_configured',
                source='mor',
            )

        url = self._base_url() + getattr(settings, 'MOR_VERIFY_PATH', '/v1/taxpayer/verify')
        payload = {'tin': tin}
        if sub_tin:
            payload['sub_tin'] = sub_tin
        api_key = getattr(settings, 'MOR_API_KEY', '')
        if api_key:
            payload['api_key'] = api_key

        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Shega-Revenues-Gateway/1.0',
            },
            method='POST',
        )
        try:
            with urllib.request.urlopen(request, timeout=10) as resp:
                raw = json.loads(resp.read().decode('utf-8') or '{}')
        except urllib.error.HTTPError as e:
            # MoR answered with an error — log status only, never the body.
            logger.info(
                'mor gateway http error: status=%s tin_masked=%s reason=%s',
                e.code,
                str(payload.get('tin', ''))[:2] + '***',
                'mor_down',
            )
            return MorGatewayResult(
                status=STATUS_UNAVAILABLE if e.code >= 500 else STATUS_FAILED,
                tin=tin,
                sub_tin=sub_tin,
                reason='mor_down' if e.code >= 500 else 'mor_rejected',
                source='mor',
            )
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as e:
            logger.info('mor gateway transport error: type=%s', type(e).__name__)
            return MorGatewayResult(
                status=STATUS_UNAVAILABLE,
                tin=tin,
                sub_tin=sub_tin,
                reason='mor_unreachable',
                source='mor',
            )

        return map_official_response(tin, sub_tin, raw)


def map_official_response(tin: str, sub_tin: str | None, raw: dict) -> MorGatewayResult:
    """Whitelist an official MoR response into the canonical result.

    The adapter contract is intentionally strict: only keys read here are kept.
    ``raw`` is never persisted or logged (masked TIN only).
    """
    code = str(raw.get('status') or raw.get('code') or '').lower()
    verified = code in ('verified', 'valid', 'success', 'found', 'active', '200')
    not_found = code in ('not_found', 'invalid', 'nf', '404', 'inactive', 'suspended')

    if verified:
        name = str(raw.get('name') or raw.get('taxpayer_name') or '').strip() or None
        reg = raw.get('registration') or raw.get('registered') or {}
        if isinstance(reg, dict):
            reg = {k: reg[k] for k in ('tin', 'sub_tin', 'business_registration_no', 'taxpayer_type',
                                       'category', 'status', 'address', 'city', 'woreda', 'kebele',
                                       'house_no', 'issued_at') if k in reg}
        else:
            reg = None
        return MorGatewayResult(
            status=STATUS_VERIFIED,
            tin=tin,
            sub_tin=sub_tin,
            taxpayer_name=name,
            taxpayer_type=str(raw.get('taxpayer_type') or raw.get('type') or '').strip() or None,
            registration=reg or None,
            reference=str(raw.get('reference') or raw.get('ref') or raw.get('consultation_id') or '').strip() or None,
            verified_at=str(raw.get('verified_at') or datetime.now(timezone.utc).isoformat()),
            source='mor',
        )
    if not_found:
        return MorGatewayResult(
            status=STATUS_NOT_FOUND,
            tin=tin,
            sub_tin=sub_tin,
            reference=str(raw.get('reference') or '').strip() or None,
            verified_at=str(raw.get('verified_at') or datetime.now(timezone.utc).isoformat()),
            source='mor',
        )

    # Not a status we recognise: the MoR integration contract changed.
    return MorGatewayResult(
        status=STATUS_UNAVAILABLE,
        tin=tin,
        sub_tin=sub_tin,
        reason='mor_unrecognised_response',
        source='mor',
    )