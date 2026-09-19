"""Security helpers for the §20 cloud sync transport (Appendix J hardening).

Centralises:
- device-key hashing (PBKDF2-HMAC-SHA256 with a server pepper, replacing the
  original unsalted SHA-256 so offline brute-force of a leaked DB is infeasible),
- input validation for device identity/names so we never store or reflect
  unbounded or control-character payloads.
"""
import hashlib
import json
import re
import secrets

from django.conf import settings
from rest_framework.exceptions import ValidationError

_PBKDF2_ITERATIONS = 600_000
_PAIRING_ITERATIONS = 210_000  # pairing tokens are high-entropy; 210k keeps verify fast

# Device ids come from each install's uuid-based sync_meta.device_id (see the
# mobile/desktop clients). We constrain to a safe printable charset and a sane
# length; anything else is rejected rather than stored/reflected.
_DEVICE_ID = re.compile(r'^[A-Za-z0-9._:\-]{1,64}$')
# Printable characters, no C0 control chars / DEL. Note the raw-string \x escapes.
_DEVICE_NAME = re.compile(r'^[^\x00-\x1f\x7f]{1,120}$')

_ENTITY = re.compile(r'^[A-Za-z0-9_]{1,80}$')
_OP = re.compile(r'^(INSERT|UPDATE|DELETE)$')
MAX_PAYLOAD_BYTES = 64 * 1024  # 64 KiB per change payload
MAX_PAYLOAD_KEYS = 200  # guard against pathological JSON objects


def hash_device_key(secret: str) -> str:
    """PBKDF2-HMAC-SHA256 of a provisioned device key.

    The salt is a server-only pepper (never sent to clients) so the stored hash
    is useless without both the DB and the pepper, and PBKDF2's cost defeats
    offline brute-force even for modest-entropy keys. Rotating ``SECRET_KEY``
    (or ``DEVICE_KEY_PEPPER`` when set) invalidates hashed keys, consistent with
    SECRET_KEY rotation already invalidating sessions and signed values.
    """
    pepper = (getattr(settings, 'DEVICE_KEY_PEPPER', None) or settings.SECRET_KEY).encode('utf-8')
    return hashlib.pbkdf2_hmac(
        'sha256',
        secret.encode('utf-8'),
        pepper,
        _PBKDF2_ITERATIONS,
    ).hex()


def validate_device_id(value):
    """Return a normalized device id or raise a 400 ValidationError."""
    if not isinstance(value, str) or not value:
        raise ValidationError({'device_id': 'device id is required'})
    value = value.strip()
    if not _DEVICE_ID.match(value):
        raise ValidationError(
            {'device_id': 'device id must be 1-64 chars of [A-Za-z0-9._:-]'}
        )
    return value


def validate_device_name(value):
    """Return a bounded, control-character-free device name (fallback default)."""
    if not value:
        return 'Shega Device'
    value = str(value).strip()
    if not _DEVICE_NAME.match(value):
        raise ValidationError({'device_name': 'device name is invalid or too long'})
    return value[:120]


def _pbkdf2(secret: str, iterations: int) -> str:
    """PBKDF2-HMAC-SHA256 keyed by the server pepper (320-bit output)."""
    pepper = (getattr(settings, 'DEVICE_KEY_PEPPER', None) or settings.SECRET_KEY).encode('utf-8')
    return hashlib.pbkdf2_hmac('sha256', secret.encode('utf-8'), pepper, iterations, dklen=40).hex()


def generate_pairing_token() -> str:
    """Cryptographically-secure one-time pairing token (high-entropy, ~240 bits).

    Issued to the Owner to render as a QR (or grouped manual code); never shown
    again. Only ``hash_pairing_token()`` is stored, so the DB can't leak it.
    """
    return secrets.token_urlsafe(32)


def hash_pairing_token(token: str) -> str:
    """PBKDF2 hash of a pairing token for ``PairingInvitation.token_hash``."""
    return _pbkdf2(token, _PAIRING_ITERATIONS)


def format_pairing_code(token: str) -> str:
    """Group a pairing token for display: ``XXXX-XXXX-XXXX-XXXX``."""
    flat = re.sub(r'[^A-Za-z0-9]', '', token)
    return '-'.join(flat[i:i + 4] for i in range(0, len(flat), 4))


def generate_pairing_code() -> str:
    """Cryptographically-secure 6-digit human-readable pairing code.

    Manual-entry alternative to the high-entropy QR token. Low entropy by design
    (10^6 space), so it is always short-lived (PAIRING_TTL_MINUTES), single-use,
    and never a permanent credential — the token stays the QR secret. The code is
    stored on the invitation (lookup by code must work), but accepting still
    requires an authenticated account, and expiry/single-use bounds brute-force.
    """
    return f'{secrets.randbelow(1_000_000):06d}'


def generate_device_key() -> str:
    """Cryptographically-secure device key (≈256 bits) for cloud-sync transport.

    Handed to a device exactly once at pairing-accept (or provisioning) time so
    the same desktop/mobile can authenticate to /api/sync/* with the device-key
    transport. Only ``hash_device_key()`` is stored; the raw key is never shown
    again and is useless until the owner approves the pending device.
    """
    return secrets.token_urlsafe(32)


def validate_entity(entity):
    if not isinstance(entity, str) or not _ENTITY.match(entity):
        raise ValidationError({'entity': 'invalid entity name'})
    return entity


def validate_op(op):
    if not isinstance(op, str) or not _OP.match(op):
        raise ValidationError({'op': 'invalid operation'})
    return op


def validate_payload(payload):
    """Reject oversized or pathological change payloads (push DoS guard)."""
    if not isinstance(payload, dict):
        raise ValidationError({'payload': 'payload must be a JSON object'})
    if len(payload) > MAX_PAYLOAD_KEYS:
        raise ValidationError({'payload': f'payload exceeds {MAX_PAYLOAD_KEYS} fields'})
    try:
        if len(json.dumps(payload, separators=(',', ':')).encode('utf-8')) > MAX_PAYLOAD_BYTES:
            raise ValidationError({'payload': f'payload exceeds {MAX_PAYLOAD_BYTES // 1024} KiB'})
    except (TypeError, ValueError):
        raise ValidationError({'payload': 'payload is not JSON-serializable'})
    return payload
