from django.contrib import admin

from .models import CustomerProfile


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ['company_name', 'user', 'city', 'country', 'status', 'created_at']
    list_filter = ['status', 'country', 'region', 'created_at']
    search_fields = ['company_name', 'tin_number', 'user__email', 'user__username']
    readonly_fields = ['created_at', 'updated_at']
