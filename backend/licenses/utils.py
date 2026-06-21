import random
import string
import re


def generate_license_key():
    chars = string.ascii_uppercase + string.digits
    groups = [''.join(random.choices(chars, k=4)) for _ in range(3)]
    return f"ERP-{'-'.join(groups)}"


def validate_license_key(key):
    pattern = r'^ERP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$'
    return bool(re.match(pattern, key))


def check_device_limit(license_instance):
    active_count = license_instance.device_activations.filter(is_active=True).count()
    if license_instance.device_limit == 0:
        return True
    return active_count < license_instance.device_limit
