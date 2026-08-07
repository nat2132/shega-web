from django.db import migrations


# The two paid subscriptions repriced to 2,499 ETB (1 month) and 5,499 ETB
# (3 months). Same tier/device_limit/names as migration 0003, only the price
# changes.
PRICED_PLANS = {
    1: 2499.00,
    3: 5499.00,
}


def set_prices(apps, schema_editor):
    LicensePlan = apps.get_model('licenses', 'LicensePlan')
    for duration, price in PRICED_PLANS.items():
        plan = LicensePlan.objects.filter(
            name='Subscription',
            duration_months=duration,
        ).first()
        if plan:
            plan.price = price
            plan.save(update_fields=['price'])


def unset_prices(apps, schema_editor):
    LicensePlan = apps.get_model('licenses', 'LicensePlan')
    for duration, price in PRICED_PLANS.items():
        plan = LicensePlan.objects.filter(
            name='Subscription',
            duration_months=duration,
        ).first()
        if plan:
            plan.price = price - 500
            plan.save(update_fields=['price'])


class Migration(migrations.Migration):

    dependencies = [
        ('licenses', '0003_simplify_plans'),
    ]

    operations = [
        migrations.RunPython(set_prices, unset_prices),
    ]