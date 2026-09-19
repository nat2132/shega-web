from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import BusinessMembership, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        exclude = ('password', 'user_permissions', 'groups')
        read_only_fields = ('created_at', 'updated_at', 'last_login', 'date_joined')


class UserCreateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=False, allow_blank=True)
    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            'name', 'username', 'email', 'password', 'password2', 'phone',
            'business_name', 'business_type', 'address',
        )

    def validate(self, attrs):
        password = attrs.get('password', '')
        password2 = attrs.get('password2') or ''
        if password2 and password != password2:
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        email = attrs.get('email')
        if not email:
            raise serializers.ValidationError({'email': 'This field is required.'})
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({'email': 'A user with this email already exists.'})
        return attrs

    def create(self, validated_data):
        validated_data['password'] = make_password(validated_data['password'])
        name = validated_data.pop('name', '')
        if name:
            parts = name.strip().split()
            validated_data['first_name'] = parts[0]
            if len(parts) > 1:
                validated_data['last_name'] = ' '.join(parts[1:])
        validated_data['username'] = validated_data.get('username') or validated_data['email']
        validated_data['is_customer'] = True
        return super().create(validated_data)


class LoginSerializer(TokenObtainPairSerializer):
    username_field = 'username'

    def validate(self, attrs):
        username = attrs.get(self.username_field)

        if '@' in username:
            users = User.objects.filter(email=username)
            if users.exists():
                attrs[self.username_field] = users.first().username

        return super().validate(attrs)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is not correct.')
        return value


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'email', 'phone', 'business_name', 'business_type',
            'address', 'notes', 'first_name', 'last_name',
        )


class BusinessMembershipSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    business_name = serializers.SerializerMethodField()

    class Meta:
        model = BusinessMembership
        fields = ('id', 'user_id', 'user_name', 'user_email', 'business_id',
                  'business_name', 'role', 'permissions', 'status', 'is_active',
                  'created_at', 'updated_at')
        read_only_fields = ('id', 'user_id', 'user_name', 'user_email', 'business_id',
                            'business_name', 'created_at', 'updated_at')

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username or ''

    def get_user_email(self, obj):
        return obj.user.email or obj.user.username or ''

    def get_business_name(self, obj):
        return obj.business.business_name or obj.business.username or ''


class MemberAddSerializer(serializers.Serializer):
    """Add a member to a business by their existing account identity."""
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=[c for c in BusinessMembership.Role.choices if c[0] != 'owner'],
        default='cashier',
    )
    permissions = serializers.JSONField(required=False, default=dict)

    def validate(self, attrs):
        if not (attrs.get('email') or attrs.get('phone')):
            raise serializers.ValidationError(
                {'detail': 'Provide either email or phone to find the account.'}
            )
        return attrs


class MemberRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(
        choices=[c for c in BusinessMembership.Role.choices if c[0] != 'owner'],
        required=False,
    )
    is_active = serializers.BooleanField(required=False)
    status = serializers.ChoiceField(
        choices=BusinessMembership.Status.choices, required=False
    )
    permissions = serializers.JSONField(required=False)
