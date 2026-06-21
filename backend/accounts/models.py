from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class BusinessTypes(models.TextChoices):
        RETAILER = 'Retailer', 'Retailer'
        WHOLESALER = 'Wholesaler', 'Wholesaler'
        DISTRIBUTOR = 'Distributor', 'Distributor'
        WAREHOUSE = 'Warehouse', 'Warehouse'
        SMALL_BUSINESS = 'Small_Business', 'Small Business'

    phone = models.CharField(max_length=20, unique=True)
    business_name = models.CharField(max_length=255, blank=True)
    business_type = models.CharField(
        max_length=50, choices=BusinessTypes.choices, blank=True
    )
    address = models.TextField(blank=True)
    is_customer = models.BooleanField(default=False)
    is_admin = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return self.email or self.username
