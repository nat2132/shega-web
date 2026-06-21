import uuid
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from django.db import transaction


def generate_transaction_id() -> str:
    return f"TXN-{uuid.uuid4().hex[:12].upper()}"


def generate_invoice_number() -> str:
    rand_part = secrets.token_hex(4).upper()
    return f"INV-{timezone.now().strftime('%Y%m%d')}-{rand_part}"


@transaction.atomic
def process_approved_payment(payment):
    from licenses.models import License

    if payment.plan is None:
        return

    duration_days = payment.plan.duration_months * 30

    if payment.license:
        license_instance = payment.license
        new_expiry = license_instance.expiry_date + timedelta(days=duration_days)
        license_instance.expiry_date = new_expiry
        if license_instance.status == "expired":
            license_instance.status = "active"
        license_instance.save()
    else:
        license_instance = License.objects.create(
            customer=payment.customer,
            plan=payment.plan,
            status="active",
            start_date=timezone.now().date(),
            expiry_date=timezone.now().date() + timedelta(days=duration_days),
        )
        payment.license = license_instance
        payment.save(update_fields=["license"])

    return license_instance
