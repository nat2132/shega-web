from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import LicensePlan, License, DeviceActivation, LicenseAuditLog

User = get_user_model()


class LicensePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = LicensePlan
        fields = '__all__'
        read_only_fields = ['created_at']


class LicenseSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()
    plan_details = LicensePlanSerializer(source='plan', read_only=True)

    class Meta:
        model = License
        fields = [
            'id', 'license_key', 'customer', 'customer_name',
            'plan', 'plan_name', 'plan_details',
            'status', 'start_date', 'expiry_date', 'device_limit',
            'notes', 'is_trial', 'created_at', 'updated_at',
        ]
        read_only_fields = ['license_key', 'created_at', 'updated_at']

    def get_customer_name(self, obj):
        return obj.customer.get_full_name() or obj.customer.email

    def get_plan_name(self, obj):
        return obj.plan.name if obj.plan else None


class LicenseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = License
        fields = [
            'customer', 'plan', 'start_date', 'expiry_date',
            'device_limit', 'notes', 'is_trial',
        ]

    def validate(self, attrs):
        if attrs.get('start_date') and attrs.get('expiry_date'):
            if attrs['expiry_date'] <= attrs['start_date']:
                raise serializers.ValidationError(
                    "Expiry date must be after start date."
                )
        return attrs

    def create(self, validated_data):
        if not validated_data.get('device_limit'):
            validated_data['device_limit'] = validated_data['plan'].device_limit
        return super().create(validated_data)

    def to_representation(self, instance):
        return LicenseSerializer(instance).data


class DeviceActivationSerializer(serializers.ModelSerializer):
    license_key = serializers.CharField(source='license.license_key', read_only=True)

    class Meta:
        model = DeviceActivation
        fields = [
            'id', 'license', 'license_key', 'device_id', 'device_name',
            'activation_date', 'last_seen', 'ip_address',
            'operating_system', 'is_active',
        ]
        read_only_fields = ['activation_date', 'last_seen']


class DeviceActivateSerializer(serializers.Serializer):
    license_key = serializers.CharField(max_length=20, required=True)
    device_id = serializers.CharField(max_length=255, required=True)
    device_name = serializers.CharField(max_length=255, required=True)
    ip_address = serializers.IPAddressField(required=False, allow_blank=True)
    operating_system = serializers.CharField(max_length=255, required=True)

    def validate_license_key(self, value):
        from .utils import validate_license_key
        if not validate_license_key(value):
            raise serializers.ValidationError("Invalid license key format.")
        return value


class LicenseAuditLogSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    license_key = serializers.CharField(source='license.license_key', read_only=True)

    class Meta:
        model = LicenseAuditLog
        fields = '__all__'
        read_only_fields = ['created_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None


class LicenseRenewSerializer(serializers.Serializer):
    plan = serializers.PrimaryKeyRelatedField(
        queryset=LicensePlan.objects.filter(is_active=True),
        required=False,
    )
    duration_months = serializers.IntegerField(required=False, min_value=1)
    start_date = serializers.DateField(required=False)
