from rest_framework import serializers

from .models import CustomerProfile


class CustomerProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomerProfile
        fields = [
            'id', 'user', 'email', 'username', 'full_name',
            'company_name', 'tin_number', 'city', 'region',
            'country', 'website', 'status', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_full_name(self, obj):
        return obj.user.get_full_name()


class CustomerListSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomerProfile
        fields = [
            'id', 'company_name', 'email', 'full_name',
            'city', 'country', 'status', 'created_at',
        ]

    def get_full_name(self, obj):
        return obj.user.get_full_name()
