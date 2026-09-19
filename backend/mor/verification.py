"""TIN validation helpers for the MoR verification seam.

Shares the same canonical statuses as the client SDK so both ends speak one
protocol:
  - ``verified``  MoR returned a match (the ONLY status that may be shown as
                  "Verified by Ministry of Revenues").
  - ``not_found`` MoR returned no match.
  - ``unavailable`` The Shega backend has no configured MoR integration (or the
                  Ministry service is unreachable/down). Never a lie: clients
                  must surface this as "Verification unavailable".
  - ``failed``    The request failed (network/5xx) without a Ministry answer.

Privacy rule (spec §U): the full TIN is never logged or stored; the backend
persists only a SHA-256 hash plus a masked form. TINs travel to MoR over TLS
and are respected as sensitive across the call chain.
"""
import hashlib
import re

from rest_framework.exceptions import ValidationError

# Canonical status values shared verbatim with shega-shared.
STATUS_VERIFIED = 'verified'
STATUS_NOT_FOUND = 'not_found'
STATUS_UNAVAILABLE = 'unavailable'
STATUS_FAILED = 'failed'

# Ethiopian TINs are numeric (commonly 8-10 digits, may carry a sub-TIN suffix).
TIN_RE = re.compile(r'\d{8,12}')
# Sub-TINs are short alphanumeric identifiers (e.g. branch codes).
SUB_TIN_RE = re.compile(r'^[A-Za-z0-9]{1,20}$')


def normalize_tin(value, field='tin'):
    """Return a canonical TIN (digits only) or raise a 400 ValidationError."""
    if value is None:
        raise ValidationError({field: 'TIN is required'})
    if not isinstance(value, str):
        raise ValidationError({field: 'TIN must be a string'})
    flat = re.sub(r'[\s\-]', '', value).strip()
    if not TIN_RE.fullmatch(flat):
        raise ValidationError(
            {field: 'TIN must be 8-12 digits (spaces and dashes are ignored)'}
        )
    if int(flat) <= 0:
        raise ValidationError({field: 'TIN is not valid'})
    return flat


def normalize_sub_tin(value):
    """Return a canonical sub-TIN or ``None``. Tolerates raw/empty input."""
    if value is None or value == '':
        return None
    if not isinstance(value, str):
        raise ValidationError({'sub_tin': 'sub-TIN must be a string'})
    flat = value.strip().upper()
    if not SUB_TIN_RE.fullmatch(flat):
        raise ValidationError({'sub_tin': 'sub-TIN may only contain letters and digits (1-20)'})
    return flat


def mask_tin(tin: str) -> str:
    """Mask a TIN for logs/UI: keep the first 2 and last 2 characters."""
    if len(tin) <= 4:
        return '*' * len(tin)
    return f'{tin[:2]}{"*" * (len(tin) - 4)}{tin[-2:]}'


def tin_digest(tin: str) -> str:
    """SHA-256 of the normalized TIN — the only persistent server-side form."""
    return hashlib.sha256(tin.encode('ascii')).hexdigest()


def classify_tin(tin: str, sub_tin) -> dict:
    """Canonical TIN identity used by the gateway/cache (never persisted raw)."""
    tin = normalize_tin(tin)
    sub_tin = normalize_sub_tin(sub_tin)
    return {'tin': tin, 'sub_tin': sub_tin, 'digest': tin_digest(tin), 'masked': mask_tin(tin)}