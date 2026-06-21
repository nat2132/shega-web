from rest_framework.permissions import BasePermission


class PublicEndpoint(BasePermission):
    def has_permission(self, request, view):
        return True
