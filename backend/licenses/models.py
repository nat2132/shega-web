from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.utils import timezone

from .utils import generate_license_key


class LicensePlan(models.Model):
    name = models.CharField(max_length=100)
    duration_months = models.IntegerField(validators=[MinValueValidator(1)])
    device_limit = models.IntegerField(default=1, help_text="0 means unlimited")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['price']
        verbose_name = "License Plan"
        verbose_name_plural = "License Plans"

    def __str__(self):
        return f"{self.name} ({self.duration_months}mo - ${self.price})"


class License(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('suspended', 'Suspended'),
        ('revoked', 'Revoked'),
    ]

    license_key = models.CharField(max_length=20, unique=True, editable=False)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='licenses',
    )
    plan = models.ForeignKey(
        LicensePlan,
        on_delete=models.PROTECT,
        related_name='licenses',
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='active', db_index=True
    )
    start_date = models.DateField()
    expiry_date = models.DateField(db_index=True)
    device_limit = models.IntegerField()
    notes = models.TextField(blank=True, default='')
    is_trial = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['license_key', 'status']),
        ]

    def save(self, *args, **kwargs):
        if not self.license_key:
            self.license_key = generate_license_key()
        if not self.device_limit and self.plan:
            self.device_limit = self.plan.device_limit
        super().save(*args, **kwargs)

    def __str__(self):
        return self.license_key


class DeviceActivation(models.Model):
    license = models.ForeignKey(
        License,
        on_delete=models.CASCADE,
        related_name='device_activations',
    )
    device_id = models.CharField(max_length=255)
    device_name = models.CharField(max_length=255)
    activation_date = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(default=timezone.now)
    ip_address = models.GenericIPAddressField()
    operating_system = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ['license', 'device_id']
        ordering = ['-activation_date']

    def __str__(self):
        return f"{self.device_name} ({self.device_id})"


class LicenseAuditLog(models.Model):
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('activated', 'Activated'),
        ('deactivated', 'Deactivated'),
        ('renewed', 'Renewed'),
        ('expired', 'Expired'),
        ('suspended', 'Suspended'),
        ('revoked', 'Revoked'),
    ]

    license = models.ForeignKey(
        License,
        on_delete=models.CASCADE,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, db_index=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='license_audit_logs',
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "License Audit Log"
        verbose_name_plural = "License Audit Logs"

    def __str__(self):
        return f"{self.license.license_key} - {self.action}"
