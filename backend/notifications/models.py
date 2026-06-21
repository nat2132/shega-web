from django.db import models
from django.conf import settings


class Notification(models.Model):
    class Type(models.TextChoices):
        RENEWAL_REMINDER = 'renewal_reminder', 'Renewal Reminder'
        EXPIRY_WARNING = 'expiry_warning', 'Expiry Warning'
        PAYMENT_RECEIVED = 'payment_received', 'Payment Received'
        PAYMENT_APPROVED = 'payment_approved', 'Payment Approved'
        PAYMENT_REJECTED = 'payment_rejected', 'Payment Rejected'
        LICENSE_CREATED = 'license_created', 'License Created'
        LICENSE_EXPIRED = 'license_expired', 'License Expired'
        SYSTEM = 'system', 'System'

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    notification_type = models.CharField(max_length=30, choices=Type.choices)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notification_type}] {self.title}"
