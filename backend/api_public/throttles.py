from rest_framework.throttling import SimpleRateThrottle


def _client_ip(request) -> str:
    return request.META.get("REMOTE_ADDR", "")


class LicenseVerifyThrottle(SimpleRateThrottle):
    scope = 'license_verify'

    def get_cache_key(self, request, view):
        ip = _client_ip(request)
        if not ip:
            return None
        return self.cache_format % {'scope': self.scope, 'ident': ip}


class GithubProxyThrottle(SimpleRateThrottle):
    """Burst cap for the public GitHub-release proxy (defends GitHub rate limit)."""

    scope = 'github'

    def get_cache_key(self, request, view):
        ip = _client_ip(request)
        if not ip:
            return None
        return self.cache_format % {'scope': self.scope, 'ident': ip}
