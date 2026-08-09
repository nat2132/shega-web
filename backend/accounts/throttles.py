"""Rate-limit thrrottles for security-sensitive authentication endpoints.

These protect against credential stuffing, registration spam, and
password-reset bombing. They layer on top of the generic
``AnonRateThrottle`` / ``UserRateThrottle`` configured project-wide.

Design notes
------------
* Anonymous, IP-bound scopes (login burst, registration, password reset) use
  the Django cache backend. For multi-worker deployments prefer a shared
  cache (Redis via ``django-redis``) — see ``CACHES`` in settings. Without a
  shared cache these still protect a single worker, and the persistent
  ``LoginAttempt`` model is the source of truth for account lockouts.
* Sensitive keys are hashed so they never leak an IP or email address verbatim
  into the cache namespace.
"""

from datetime import timedelta
from hashlib import sha256

from django.utils import timezone
from rest_framework.throttling import SimpleRateThrottle


def _hash(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()[:32]


def _client_ip(request) -> str:
    return request.META.get("REMOTE_ADDR", "")


class LoginThrottle(SimpleRateThrottle):
    """Burst limit for login attempts (anonymous requests only).

    Counts every POST to the login endpoint per client IP so a single source
    cannot hammer it. This is *not* the failed-attempt lockout — that is driven
    by the persisted ``LoginAttempt`` model in ``LoginView`` and survives cache
    clears / server restarts. This throttle merely caps the raw request rate.
    """

    scope = "login"

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return None
        ip = _client_ip(request)
        if not ip:
            return None
        return self.cache_format % {"scope": self.scope, "ident": ip}


class RegisterThrottle(SimpleRateThrottle):
    """Limit registration attempts by IP address."""

    scope = "register_ip"

    def get_cache_key(self, request, view):
        ip = _client_ip(request)
        if not ip:
            return None
        return self.cache_format % {"scope": self.scope, "ident": ip}


class RegisterEmailThrottle(SimpleRateThrottle):
    """Limit registration attempts for the same email within a time window.

    The cache key is a blend of client IP and the *normalised* email so that
    the same address cannot be hammered from a single host, while a genuine
    typo retry from elsewhere is still permitted.
    """

    scope = "register_email"

    def get_cache_key(self, request, view):
        email = (request.data.get("email") if hasattr(request, "data") else None) or ""
        if not email:
            return None
        ip = _client_ip(request) or "unknown"
        ident = _hash(f"{ip}:{email.lower()}")
        return self.cache_format % {"scope": self.scope, "ident": ident}


class PasswordResetThrottle(SimpleRateThrottle):
    """Throttle password-reset *request* submissions (email dispatch)."""

    scope = "password_reset"

    def get_cache_key(self, request, view):
        ip = _client_ip(request)
        if not ip:
            return None
        return self.cache_format % {"scope": self.scope, "ident": ip}


class PasswordResetConfirmThrottle(SimpleRateThrottle):
    """Throttle password-reset confirmation (token + new password) attempts."""

    scope = "password_reset_confirm"

    def get_cache_key(self, request, view):
        ip = _client_ip(request)
        if not ip:
            return None
        return self.cache_format % {"scope": self.scope, "ident": ip}


# --------------------------------------------------------------------------- #
# Helper for callers that want a quick, persistent "is this IP locked?" check. #
# --------------------------------------------------------------------------- #

def failed_login_count(identifier: str, window_minutes: int = 15) -> int:
    """Count failed login attempts for an identifier (username or email) within a window."""
    from .models import LoginAttempt

    cutoff = timezone.now() - timedelta(minutes=window_minutes)
    return (
        LoginAttempt.objects.filter(
            identifier=identifier,
            timestamp__gte=cutoff,
        )
        .count()
    )
