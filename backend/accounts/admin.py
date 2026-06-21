from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'phone', 'business_name', 'is_customer', 'is_staff')
    search_fields = ('email', 'phone', 'business_name')
    list_filter = ('is_customer', 'is_staff', 'business_type')
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {
            'fields': (
                'first_name', 'last_name', 'email', 'phone',
                'business_name', 'business_type', 'address',
            )
        }),
        ('Permissions', {
            'fields': (
                'is_active', 'is_staff', 'is_superuser',
                'is_customer', 'is_admin',
                'groups', 'user_permissions',
            )
        }),
        ('Verification', {
            'fields': ('email_verified', 'phone_verified'),
        }),
        ('Important dates', {
            'fields': ('last_login', 'date_joined', 'created_at', 'updated_at'),
        }),
        ('Notes', {
            'fields': ('notes',),
        }),
    )
    readonly_fields = ('created_at', 'updated_at')
