from django.db import migrations

# Retail tiers exposed to the mobile app. Four plans so subscriptions can be
# told apart by tier (Basic / Premium) AND by duration (1 month / 3 months) in
# the admin panel. The 7-day free trial is a client-side subscription state,
# not a backend plan row.
PLANS = [
    {'name': 'Basic', 'duration_months': 1, 'device_limit': 1, 'price': 1999.00},
    {'name': 'Basic', 'duration_months': 3, 'device_limit': 1, 'price': 2499.00},
    {'name': 'Premium', 'duration_months': 1, 'device_limit': 3, 'price': 2499.00},
    {'name': 'Premium', 'duration_months': 3, 'device_limit': 3, 'price': 5499.00},
]


def seed_plans(apps, schema_editor):
    LicensePlan = apps.get_model('licenses', 'LicensePlan')

    # Deactivate the previous generic "Subscription" tier so the public
    # /api/plans/ endpoint only exposes the tiered Basic / Premium rows below.
    LicensePlan.objects.filter(name='Subscription').update(is_active=False)

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
        plan.price = data['price']
        plan.is_active = True
        plan.save(update_fields=['device_limit', 'price', 'is_active'])


def unseed_plans(apps, schema_editor):
    LicensePlan = apps.get_model('licenses', 'LicensePlan')
    LicensePlan.objects.filter(name__in=['Basic', 'Premium']).update(is_active=False)


class Migration(migrations.Migration):

    dependencies = [
        ('licenses', '0004_set_subscription_prices'),
    ]

    operations = [
        migrations.RunPython(seed_plans, unseed_plans),
    ]