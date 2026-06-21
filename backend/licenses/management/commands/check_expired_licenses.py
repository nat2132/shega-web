from django.core.management.base import BaseCommand
from django.utils import timezone

from licenses.models import License, LicenseAuditLog


class Command(BaseCommand):
    help = 'Check and auto-expire licenses past their expiry date'

    def handle(self, *args, **options):
        expired_qs = License.objects.filter(
            status='active',
            expiry_date__lt=timezone.now().date(),
        )

        count = expired_qs.count()

        for lic in expired_qs.iterator():
            LicenseAuditLog.objects.create(
                license=lic,
                action='expired',
                details={'reason': 'Auto-expired by management command'},
            )

        expired_qs.update(status='expired')

        self.stdout.write(
            self.style.SUCCESS(f'Successfully expired {count} license(s)')
        )
