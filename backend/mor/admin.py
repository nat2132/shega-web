from django.contrib import admin

from .models import MorVerificationEvent


@admin.register(MorVerificationEvent)
class MorVerificationEventAdmin(admin.ModelAdmin):
    list_display = ('tin_masked', 'status', 'source', 'reference', 'created_at')
    list_filter = ('status', 'source')
    search_fields = ('tin_digest', 'tin_masked')
    date_hierarchy = 'created_at'
    readonly_fields = ('tin_digest', 'tin_masked', 'sub_tin_masked', 'status',
                       'source', 'reference', 'reason', 'created_at')