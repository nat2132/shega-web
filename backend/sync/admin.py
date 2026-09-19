from django.contrib import admin
from django.utils import timezone

from .models import SyncDevice, SyncRecord, AuditChainCommit
from .authorization import hash_device_key
from .audit_chain import verify_business_audit_chain


@admin.register(SyncDevice)
class SyncDeviceAdmin(admin.ModelAdmin):
    list_display = (
        'device_name', 'device_id', 'business', 'status', 'is_active', 'license', 'last_seen',
    )
    list_filter = ('status', 'is_active')
    search_fields = ('device_id', 'device_name', 'business__email', 'business__username')
    readonly_fields = ('device_id', 'last_seen', 'created_at', 'updated_at')
    actions = ['activate_devices', 'lock_devices', 'disable_devices', 'remove_devices']

    def activate_devices(self, request, queryset):
        queryset.update(status='active', is_active=True)
    activate_devices.short_description = 'Mark selected devices active'

    def lock_devices(self, request, queryset):
        queryset.update(status='locked')
    lock_devices.short_description = 'Lock selected devices (block sync)'

    def disable_devices(self, request, queryset):
        queryset.update(status='disabled')
    disable_devices.short_description = 'Disable selected devices (block sync)'

    def remove_devices(self, request, queryset):
        queryset.update(status='removed', is_active=False)
    remove_devices.short_description = 'Remove selected devices (block sync)'


@admin.register(SyncRecord)
class SyncRecordAdmin(admin.ModelAdmin):
    list_display = ('id', 'business', 'device', 'entity', 'entity_uuid', 'op', 'client_seq', 'created_at')
    list_filter = ('op', 'entity')
    search_fields = ('entity_uuid', 'device__device_id', 'business__email')
    readonly_fields = ('business', 'device', 'client_seq', 'entity', 'entity_uuid', 'op', 'payload', 'checksum', 'created_at')


@admin.register(AuditChainCommit)
class AuditChainCommitAdmin(admin.ModelAdmin):
    list_display = ('business', 'device', 'record_count', 'chain_status', 'committed_at')
    search_fields = ('business__email', 'business__username', 'device__device_id')
    readonly_fields = ('business', 'device', 'record_count', 'head_hash', 'records', 'committed_at')

    @admin.display(description='Chain status')
    def chain_status(self, obj):
        v = verify_business_audit_chain(obj.business_id)
        if not v.get('exists'):
            return 'no anchor'
        return ('OK' if v['ok'] else f'BROKEN {v["message"]}')
