from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import License, LicenseAuditLog


@receiver(post_save, sender=License)
def license_post_save_audit(sender, instance, created, **kwargs):
    if created:
        LicenseAuditLog.objects.create(
            license=instance,
            action='created',
            details={
                'plan': instance.plan.name,
                'duration_months': instance.plan.duration_months,
                'start_date': str(instance.start_date),
                'expiry_date': str(instance.expiry_date),
                'is_trial': instance.is_trial,
            },
        )
    else:
        prev_status = getattr(instance, '_prev_status', None)
        if prev_status and prev_status != instance.status:
            LicenseAuditLog.objects.create(
                license=instance,
                action=instance.status,
                details={
                    'previous_status': prev_status,
                    'new_status': instance.status,
                },
            )

    if (instance.status == 'active'
            and instance.expiry_date
            and instance.expiry_date < timezone.now().date()):
        License.objects.filter(pk=instance.pk).update(status='expired')
        LicenseAuditLog.objects.create(
            license=instance,
            action='expired',
            details={'reason': 'Auto-expired past expiry_date on save'},
        )
