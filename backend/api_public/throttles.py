from rest_framework.throttling import SimpleRateThrottle


class LicenseVerifyThrottle(SimpleRateThrottle):
    scope = 'license_verify'

    def get_cache_key(self, request, view):
        ident = request.META.get('REMOTE_ADDR', '')
        return self.cache_format % {'scope': self.scope, 'ident': ident}
