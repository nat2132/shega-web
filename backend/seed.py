import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from licenses.models import LicensePlan

User = get_user_model()

def seed():
    if not User.objects.filter(username='admin').exists():
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@shega.et',
            password='admin123',
            phone='+251911111111',
            business_name='Shega Admin',
            is_admin=True,
            is_staff=True,
        )
        print('Admin user created: admin / admin123')

    if not User.objects.filter(username='customer1').exists():
        customer = User.objects.create_user(
            username='customer1',
            email='customer@example.com',
            password='customer123',
            phone='+251922222222',
            business_name='ABC Trading PLC',
            business_type='Retailer',
            is_customer=True,
        )
        print('Customer user created: customer1 / customer123')

    plans_data = [
        {'name': 'Starter', 'duration_months': 3, 'device_limit': 1, 'price': 1999.00},
        {'name': 'Business', 'duration_months': 6, 'device_limit': 3, 'price': 3499.00},
        {'name': 'Enterprise', 'duration_months': 12, 'device_limit': 0, 'price': 5999.00},
    ]

    for plan_data in plans_data:
        LicensePlan.objects.get_or_create(
            name=plan_data['name'],
            defaults=plan_data,
        )
        print(f'License plan created: {plan_data["name"]}')

    print('\nSeed completed successfully!')
    print('---')
    print('Admin login:  admin / admin123')
    print('Customer login: customer1 / customer123')

if __name__ == '__main__':
    seed()
