from rest_framework.throttling import SimpleRateThrottle


class MorVerifyThrottle(SimpleRateThrottle):
    """Per-user burst cap on taxpayer lookups (defends the MoR/backend rate).

    Uses the scope configured as ``mor_verify`` in REST_FRAMEWORK throttle
    rates; keyed by authenticated user id so a bot farm can not hide behind
    shared IPs.
    """

    scope = 'mor_verify'

    def get_cache_key(self, request, view):
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            return None
        return self.cache_format % {'scope': self.scope, 'ident': user.pk}