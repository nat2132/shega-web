"""Rate limiting for admin-facing API endpoints.

Every endpoint under ``/api/admin/`` is already gated behind
``IsAuthenticated, IsAdminUser``; these throttles add a per-staff *burst* cap so
a compromised or buggy admin script cannot flood the dashboard endpoints and a
single authenticated principal cannot brute-force admin actions.
"""

from rest_framework.throttling import UserRateThrottle


class AdminUserRateThrottle(UserRateThrottle):
    """Per authenticated admin: 1000 requests/hour (burst-friendly)."""

    scope = "admin_user"
