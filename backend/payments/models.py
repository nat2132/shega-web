from django.conf import settings
from django.db import models

from payments.utils import generate_transaction_id, generate_invoice_number


class Payment(models.Model):
    class PaymentMethod(models.TextChoices):
        BANK_TRANSFER = "bank_transfer", "Bank Transfer"
        TELEBIRR = "telebirr", "Telebirr"
        CHAPA = "chapa", "Chapa"
        CASH = "cash", "Cash"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    license = models.ForeignKey(
        "licenses.License",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
    )
    plan = models.ForeignKey(
        "licenses.LicensePlan",
        on_delete=models.SET_NULL,
        null=True,
        related_name="payments",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_id = models.CharField(
        max_length=100, unique=True, blank=True, default=generate_transaction_id
    )
    receipt_image = models.ImageField(upload_to="receipts/")
    payment_method = models.CharField(
        max_length=20, choices=PaymentMethod.choices
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    admin_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="reviewed_payments",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.transaction_id} - {self.customer} ({self.status})"


class Invoice(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SENT = "sent", "Sent"
        PAID = "paid", "Paid"
        CANCELLED = "cancelled", "Cancelled"

    invoice_number = models.CharField(
        max_length=50, unique=True, default=generate_invoice_number
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="invoices",
    )
    payment = models.OneToOneField(
        Payment, on_delete=models.SET_NULL, null=True, related_name="invoice"
    )
    license = models.ForeignKey(
        "licenses.License",
        on_delete=models.SET_NULL,
        null=True,
        related_name="invoices",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )
    due_date = models.DateField()
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.invoice_number} - {self.customer} ({self.status})"
