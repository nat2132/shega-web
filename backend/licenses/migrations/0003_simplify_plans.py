from django.db import migrations


# Exactly two paid subscriptions (1 month, 3 months), a single tier at
# device_limit 1. The 7-day free trial is a client-side subscription state,
# not a backend plan row.
PAID_PLANS = [
    {'name': 'Subscription', 'duration_months': 1, 'device_limit': 1, 'price': 2999.00},
    {'name': 'Subscription', 'duration_months': 3, 'device_limit': 1, 'price': 6999.00},
]


def seed_plans(apps, schema_editor):
    LicensePlan = apps.get_model('licenses', 'LicensePlan')

    # Deactivate every existing tier (Basic / Premium / legacy) and upsert the
    # two paid subscriptions (1 month, 3 months) at device_limit 1. We never
    # delete rows so existing licenses keep their FK intact.
    LicensePlan.objects.all().update(is_active=False)

    for data in PAID_PLANS:
        plan, _ = LicensePlan.objects.get_or_create(
            name=data['name'],
            duration_months=data['duration_months'],
            defaults=data,
        )
        plan.device_limit = data['device_limit']
        plan.price = data['price']
        plan.is_active = True
        plan.save(update_fields=['device_limit', 'price', 'is_active'])


def unseed_plans(apps, schema_editor):
    LicensePlan = apps.get_model('licenses', 'LicensePlan')
    LicensePlan.objects.filter(name='Subscription').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('licenses', '0002_seed_retail_plans'),
    ]

    operations = [
        migrations.RunPython(seed_plans, unseed_plans),
    ]