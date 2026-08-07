from rest_framework import serializers


class VerifyLicenseSerializer(serializers.Serializer):
    license_key = serializers.CharField(required=False, allow_blank=True)
    device_id = serializers.CharField(required=False, allow_blank=True)
    device_name = serializers.CharField(required=False, allow_blank=True, default='')
    operating_system = serializers.CharField(required=False, allow_blank=True, default='')


class ActivateDeviceSerializer(serializers.Serializer):
    license_key = serializers.CharField(required=True)
    device_id = serializers.CharField(required=True)
    device_name = serializers.CharField(required=False, allow_blank=True, default='')
    operating_system = serializers.CharField(required=False, allow_blank=True, default='')


class DeactivateDeviceSerializer(serializers.Serializer):
    license_key = serializers.CharField(required=True)
    device_id = serializers.CharField(required=True)


class RenewLicenseSerializer(serializers.Serializer):
    license_key = serializers.CharField(required=True)
    payment_reference = serializers.CharField(required=True)


class LicenseStatusSerializer(serializers.Serializer):
    license_key = serializers.CharField(required=False, allow_blank=True)
