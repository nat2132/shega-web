from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_admin)


class IsCustomerUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_customer)


class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user == obj
            or request.user.is_admin
            or request.user.is_staff
        )
