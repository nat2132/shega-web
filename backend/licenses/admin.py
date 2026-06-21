from django.contrib import admin

from .models import LicensePlan, License, DeviceActivation, LicenseAuditLog


@admin.register(LicensePlan)
class LicensePlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'duration_months', 'device_limit', 'price', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']
    list_editable = ['is_active']


@admin.register(License)
class LicenseAdmin(admin.ModelAdmin):
    list_display = ['license_key', 'customer', 'plan', 'status', 'start_date', 'expiry_date', 'is_trial']
    list_filter = ['status', 'plan', 'is_trial']
    search_fields = ['license_key', 'customer__email']
    readonly_fields = ['license_key', 'created_at', 'updated_at']
    date_hierarchy = 'expiry_date'


@admin.register(DeviceActivation)
class DeviceActivationAdmin(admin.ModelAdmin):
    list_display = ['license', 'device_name', 'device_id', 'activation_date', 'last_seen', 'is_active']
    list_filter = ['is_active', 'operating_system']
    search_fields = ['device_id', 'device_name', 'license__license_key']
    readonly_fields = ['activation_date', 'last_seen']


@admin.register(LicenseAuditLog)
class LicenseAuditLogAdmin(admin.ModelAdmin):
    list_display = ['license', 'action', 'created_by', 'created_at']
    list_filter = ['action']
    search_fields = ['license__license_key', 'created_by__email']
    readonly_fields = ['license', 'action', 'details', 'ip_address', 'created_by', 'created_at']
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
