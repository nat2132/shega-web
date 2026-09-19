from django.conf import settings
from django.db import models

from .verification import STATUS_VERIFIED, STATUS_NOT_FOUND, STATUS_UNAVAILABLE, STATUS_FAILED


class MorVerificationEvent(models.Model):
    """Privacy-safe audit trail of backend MoR lookups.

    Stores only the SHA-256 ``tin_digest`` and a masked TIN — the full taxpayer
    identifier is never persisted. Event rows are written for live Ministry
    calls only (cache hits are suppressed to avoid log spam).
    """

    class Status(models.TextChoices):
        VERIFIED = STATUS_VERIFIED, 'Verified'
        NOT_FOUND = STATUS_NOT_FOUND, 'Not found'
        UNAVAILABLE = STATUS_UNAVAILABLE, 'Unavailable'
        FAILED = STATUS_FAILED, 'Failed'

    class Source(models.TextChoices):
        MOR = 'mor', 'Ministry of Revenues (live)'
        BACKEND = 'backend', 'Shega backend cache'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mor_verifications',
        null=True,
        blank=True,
    )
    tin_digest = models.CharField(max_length=64, db_index=True)
    tin_masked = models.CharField(max_length=16)
    sub_tin_masked = models.CharField(max_length=16, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MOR)
    reference = models.CharField(max_length=120, blank=True)
    reason = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tin_digest', 'created_at']),
        ]

    def __str__(self):
        return f'[{self.status}] {self.tin_masked} @ {self.created_at:%Y-%m-%d %H:%M}'