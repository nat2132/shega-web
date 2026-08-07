from django.db import migrations


# Retail tiers exposed to the mobile app. These map to the two plan names the
# app's subscription UI understands (basic / premium) and carry the same prices
# as the app's stored-value fallback so a payment's plan_id is always valid.
PLANS = [
    {'name': 'Basic', 'duration_months': 1, 'device_limit': 1, 'price': 1999.00},
    {'name': 'Basic', 'duration_months': 3, 'device_limit': 1, 'price': 2499.00},
    {'name': 'Premium', 'duration_months': 1, 'device_limit': 3, 'price': 2499.00},
    {'name': 'Premium', 'duration_months': 3, 'device_limit': 3, 'price': 5499.00},
]


def seed_plans(apps, schema_editor):
    LicensePlan = apps.get_model('licenses', 'LicensePlan')

    # Deactivate every plan so the public /api/plans/ endpoint only exposes the
    # retail tiers we upsert below. Exclude nothing so previously created
    # basic/premium rows are not left active as duplicates.
    LicensePlan.objects.all().update(is_active=False)

    for data in PLANS:
        plan, _ = LicensePlan.objects.get_or_create(
            name=data['name'],
            duration_months=data['duration_months'],
            price=data['price'],
            defaults={
                'device_limit': data['device_limit'],
                'is_active': True,
            },
        )
        plan.device_limit = data['device_limit']
        plan.is_active = True
        plan.save(update_fields=['device_limit', 'is_active'])


def unseed_plans(apps, schema_editor):
    LicensePlan = apps.get_model('licenses', 'LicensePlan')
    LicensePlan.objects.filter(name__in=['Basic', 'Premium']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('licenses', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_plans, unseed_plans),
    ]