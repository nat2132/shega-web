from django.contrib.auth.models import AbstractUser
from django.db import models


class LoginAttempt(models.Model):
    """Persistent record of a login attempt (success or failure).

    The failed-attempt window that powers the 5-strike, 15-minute account
    lockout is derived from this table rather than an in-process cache, so the
    lockout state survives server restarts and is consistent across all
    application workers.
    """

    class Outcome(models.TextChoices):
        FAILED = "failed", "Failed"
        SUCCESS = "success", "Success"

    identifier = models.CharField(
        max_length=254,
        help_text="The username or email the client attempted to authenticate with.",
    )
    ip_address = models.GenericIPAddressField()
    user = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="login_attempts",
    )
    success = models.BooleanField(default=False)
    outcome = models.CharField(max_length=10, choices=Outcome.choices)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["-timestamp"], name="loginattempt_ts_desc"),
            models.Index(fields=["identifier", "-timestamp"], name="loginattempt_ident_ts"),
            models.Index(fields=["ip_address", "-timestamp"], name="loginattempt_ip_ts"),
        ]

    def __str__(self):
        return f"{self.identifier} @ {self.ip_address} -> {self.outcome}"


class User(AbstractUser):
    class BusinessTypes(models.TextChoices):
        RETAILER = 'Retailer', 'Retailer'
        WHOLESALER = 'Wholesaler', 'Wholesaler'
        DISTRIBUTOR = 'Distributor', 'Distributor'
        WAREHOUSE = 'Warehouse', 'Warehouse'
        SMALL_BUSINESS = 'Small_Business', 'Small Business'

    phone = models.CharField(max_length=20, unique=True, blank=True, null=True)
    business_name = models.CharField(max_length=255, blank=True)
    business_type = models.CharField(
        max_length=50, choices=BusinessTypes.choices, blank=True
    )
    address = models.TextField(blank=True)
    is_customer = models.BooleanField(default=False)
    is_admin = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return self.email or self.username
