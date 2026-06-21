from django.contrib import admin

from payments.models import Payment, Invoice


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        "transaction_id",
        "customer",
        "amount",
        "payment_method",
        "status",
        "created_at",
        "reviewed_at",
    ]
    list_filter = ["status", "payment_method", "created_at"]
    search_fields = [
        "transaction_id",
        "customer__email",
        "customer__first_name",
        "customer__last_name",
    ]
    readonly_fields = [
        "transaction_id",
        "reviewed_by",
        "reviewed_at",
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = ["customer", "license", "plan", "reviewed_by"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = [
        "invoice_number",
        "customer",
        "amount",
        "status",
        "due_date",
        "paid_at",
        "created_at",
    ]
    list_filter = ["status", "due_date", "created_at"]
    search_fields = [
        "invoice_number",
        "customer__email",
    ]
    readonly_fields = [
        "invoice_number",
        "paid_at",
        "created_at",
    ]
    autocomplete_fields = ["customer", "payment", "license"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]
