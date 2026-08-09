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
    from accounts.security_log import log_security_event

    if payment.plan is None:
        return

    duration_days = payment.plan.duration_months * 30
    today = timezone.now().date()

    if payment.license:
        license_instance = payment.license
        # Renew an *existing* license the customer already holds for this plan.
        new_expiry = (
            license_instance.expiry_date
            if license_instance.expiry_date and license_instance.expiry_date > today
            else today
        ) + timedelta(days=duration_days)
        license_instance.expiry_date = new_expiry
        if license_instance.status in ("expired", "revoked"):
            license_instance.status = "active"
        license_instance.save()
    else:
        # Guard: do not create a second *active* license for the same customer
        # and plan while one is still valid. A new active license is only
        # created when none currently covers this plan (i.e. a brand-new
        # upgrade or an expired license being replaced).
        active_for_plan = License.objects.filter(
            customer=payment.customer,
            plan=payment.plan,
            status="active",
            expiry_date__gt=today,
        ).exists()
        if active_for_plan:
            log_security_event(
                "payment_approve_duplicate_active_license_blocked",
                level="warning",
                user=payment.customer.email,
                plan=payment.plan.name,
                payment_id=payment.id,
            )
            return None

        license_instance = License.objects.create(
            customer=payment.customer,
            plan=payment.plan,
            status="active",
            start_date=today,
            expiry_date=today + timedelta(days=duration_days),
        )
        payment.license = license_instance
        payment.save(update_fields=["license"])

    log_security_event(
        "payment_approved_activated",
        level="info",
        user=payment.customer.email,
        plan=payment.plan.name,
        payment_id=payment.id,
        license_id=license_instance.id,
        expiry=str(license_instance.expiry_date),
    )

    return license_instance
