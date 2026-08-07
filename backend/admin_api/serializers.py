from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Sum as SumModel

from admin_api.models import (
    SystemSetting, FeatureFlag, AppVersion,
    SupportTicket, SupportReply, AuditLog, AdminSession,
)
from accounts.models import User
from customers.models import CustomerProfile
from licenses.models import License, LicensePlan, LicenseAuditLog
from payments.models import Payment, Invoice
from notifications.models import Notification

User = get_user_model()


class AdminUserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'phone', 'first_name', 'last_name',
            'is_active', 'is_admin', 'is_superuser', 'date_joined',
            'last_login', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'created_at', 'updated_at']


class AdminUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password2', 'phone',
            'first_name', 'last_name', 'is_admin', 'is_superuser',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.is_staff = True
        user.save()
        return user


class AdminUserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        exclude = ['password', 'user_permissions', 'groups']
        read_only_fields = ['id', 'date_joined', 'last_login', 'created_at', 'updated_at']


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'email', 'phone', 'first_name', 'last_name',
            'is_active', 'is_admin', 'is_superuser',
        ]


class BusinessListSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='get_full_name', read_only=True)
    company_name = serializers.SerializerMethodField()
    customer_profile_id = serializers.SerializerMethodField()
    customer_status = serializers.SerializerMethodField()
    license_count = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    current_plan = serializers.SerializerMethodField()
    license_status = serializers.SerializerMethodField()
    license_expiry = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'phone', 'business_name', 'company_name',
            'business_type', 'is_active', 'is_customer',
            'email_verified', 'phone_verified',
            'customer_profile_id', 'customer_status',
            'license_count', 'total_paid',
            'current_plan', 'license_status', 'license_expiry',
            'date_joined', 'last_login', 'created_at', 'updated_at',
            'notes',
        ]
        read_only_fields = fields

    def get_customer_profile_id(self, obj):
        profile = getattr(obj, 'customer_profile', None)
        return profile.id if profile else None

    def get_customer_status(self, obj):
        profile = getattr(obj, 'customer_profile', None)
        return profile.status if profile else None

    def get_company_name(self, obj):
        profile = getattr(obj, 'customer_profile', None)
        return profile.company_name if profile and profile.company_name else (obj.business_name or obj.get_full_name())

    def get_current_plan(self, obj):
        license = next(iter(obj.licenses.all()), None)
        return license.plan.name if license and license.plan else None

    def get_license_status(self, obj):
        license = next(iter(obj.licenses.all()), None)
        return license.status if license else None

    def get_license_expiry(self, obj):
        license = next(iter(obj.licenses.all()), None)
        return license.expiry_date.isoformat() if license and license.expiry_date else None

    def get_license_count(self, obj):
        return obj.licenses.count()

    def get_total_paid(self, obj):
        total = obj.payments.filter(status='approved').aggregate(
            total=SumModel('amount')
        )['total']
        return float(total) if total else 0.0


class BusinessDetailSerializer(serializers.ModelSerializer):
    customer_profile = serializers.SerializerMethodField()
    licenses = serializers.SerializerMethodField()
    recent_payments = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'phone', 'first_name', 'last_name',
            'business_name', 'business_type', 'address',
            'is_active', 'is_customer', 'is_admin',
            'email_verified', 'phone_verified',
            'customer_profile', 'licenses', 'recent_payments',
            'date_joined', 'last_login', 'created_at', 'updated_at',
            'notes',
        ]
        read_only_fields = fields

    def get_customer_profile(self, obj):
        profile = getattr(obj, 'customer_profile', None)
        if profile:
            from customers.serializers import CustomerProfileSerializer
            return CustomerProfileSerializer(profile).data
        return None

    def get_licenses(self, obj):
        licenses = obj.licenses.select_related('plan').all()
        from licenses.serializers import LicenseSerializer
        return LicenseSerializer(licenses, many=True).data

    def get_recent_payments(self, obj):
        payments = obj.payments.select_related('plan').order_by('-created_at')[:5]
        from payments.serializers import PaymentSerializer
        return PaymentSerializer(payments, many=True).data


class SubscriptionListSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.EmailField(source='customer.email')
    plan_name = serializers.CharField(source='plan.name')
    plan_price = serializers.DecimalField(source='plan.price', max_digits=10, decimal_places=2)
    days_remaining = serializers.SerializerMethodField()
    platform = serializers.SerializerMethodField()

    class Meta:
        model = License
        fields = [
            'id', 'license_key', 'customer', 'customer_name', 'customer_email',
            'plan', 'plan_name', 'plan_price', 'platform',
            'status', 'start_date', 'expiry_date', 'device_limit',
            'is_trial', 'days_remaining', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_customer_name(self, obj):
        return obj.customer.get_full_name() or obj.customer.email

    def get_days_remaining(self, obj):
        if obj.expiry_date:
            delta = obj.expiry_date - timezone.now().date()
            return max(delta.days, 0)
        return 0

    def get_platform(self, obj):
        active = [d for d in obj.device_activations.all() if d.is_active]
        return active[0].operating_system if active else None


class SubscriptionDetailSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.EmailField(source='customer.email')
    customer_phone = serializers.CharField(source='customer.phone')
    plan_name = serializers.CharField(source='plan.name')
    plan_details = serializers.SerializerMethodField()
    payments = serializers.SerializerMethodField()
    audit_logs = serializers.SerializerMethodField()
    device_count = serializers.SerializerMethodField()

    class Meta:
        model = License
        fields = [
            'id', 'license_key', 'customer', 'customer_name', 'customer_email', 'customer_phone',
            'plan', 'plan_name', 'plan_details',
            'status', 'start_date', 'expiry_date', 'device_limit',
            'is_trial', 'notes', 'payments', 'audit_logs', 'device_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_customer_name(self, obj):
        return obj.customer.get_full_name() or obj.customer.email

    def get_plan_details(self, obj):
        from licenses.serializers import LicensePlanSerializer
        return LicensePlanSerializer(obj.plan).data if obj.plan else None

    def get_payments(self, obj):
        payments = obj.payments.select_related('plan').all()
        from payments.serializers import PaymentSerializer
        return PaymentSerializer(payments, many=True).data

    def get_audit_logs(self, obj):
        logs = obj.audit_logs.all()[:20]
        from licenses.serializers import LicenseAuditLogSerializer
        return LicenseAuditLogSerializer(logs, many=True).data

    def get_device_count(self, obj):
        return obj.device_activations.filter(is_active=True).count()


class PaymentListSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.EmailField(source='customer.email')
    plan_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'customer', 'customer_name', 'customer_email',
            'license', 'plan', 'plan_name',
            'amount', 'transaction_id', 'receipt_image',
            'payment_method', 'status', 'admin_notes',
            'reviewed_by', 'reviewed_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_customer_name(self, obj):
        return obj.customer.get_full_name() or obj.customer.email

    def get_plan_name(self, obj):
        return obj.plan.name if obj.plan else None


class PaymentDetailSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.EmailField(source='customer.email')
    customer_phone = serializers.CharField(source='customer.phone')
    plan_name = serializers.SerializerMethodField()
    plan_details = serializers.SerializerMethodField()
    license_details = serializers.SerializerMethodField()
    invoice = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'customer', 'customer_name', 'customer_email', 'customer_phone',
            'license', 'license_details', 'plan', 'plan_name', 'plan_details',
            'amount', 'transaction_id', 'receipt_image',
            'payment_method', 'status', 'admin_notes',
            'reviewed_by', 'reviewed_at', 'invoice',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_customer_name(self, obj):
        return obj.customer.get_full_name() or obj.customer.email

    def get_plan_name(self, obj):
        return obj.plan.name if obj.plan else None

    def get_plan_details(self, obj):
        from licenses.serializers import LicensePlanSerializer
        return LicensePlanSerializer(obj.plan).data if obj.plan else None

    def get_license_details(self, obj):
        if obj.license:
            from licenses.serializers import LicenseSerializer
            return LicenseSerializer(obj.license).data
        return None

    def get_invoice(self, obj):
        if hasattr(obj, 'invoice') and obj.invoice:
            from payments.serializers import InvoiceSerializer
            return InvoiceSerializer(obj.invoice).data
        return None


class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class FeatureFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureFlag
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class AppVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppVersion
        fields = '__all__'
        read_only_fields = ['created_at']


class SupportTicketListSerializer(serializers.ModelSerializer):
    business_name = serializers.SerializerMethodField()
    business_email = serializers.EmailField(source='business.email')
    assigned_to_name = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = [
            'id', 'business', 'business_name', 'business_email',
            'subject', 'priority', 'status',
            'assigned_to', 'assigned_to_name',
            'platform', 'reply_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_business_name(self, obj):
        return obj.business.get_full_name() or obj.business.email

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.email
        return None

    def get_reply_count(self, obj):
        return obj.replies.count()


class SupportTicketDetailSerializer(serializers.ModelSerializer):
    business_name = serializers.SerializerMethodField()
    business_email = serializers.EmailField(source='business.email')
    business_phone = serializers.CharField(source='business.phone')
    assigned_to_name = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = [
            'id', 'business', 'business_name', 'business_email', 'business_phone',
            'subject', 'description', 'priority', 'status',
            'assigned_to', 'assigned_to_name',
            'platform', 'replies',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_business_name(self, obj):
        return obj.business.get_full_name() or obj.business.email

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.email
        return None

    def get_replies(self, obj):
        replies = obj.replies.select_related('admin').all()
        return SupportReplySerializer(replies, many=True).data


class SupportReplySerializer(serializers.ModelSerializer):
    admin_name = serializers.SerializerMethodField()

    class Meta:
        model = SupportReply
        fields = [
            'id', 'ticket', 'admin', 'admin_name',
            'message', 'is_internal',
            'created_at',
        ]
        read_only_fields = ['id', 'admin', 'admin_name', 'created_at']

    def get_admin_name(self, obj):
        if obj.admin:
            return obj.admin.get_full_name() or obj.admin.email
        return None


class AuditLogSerializer(serializers.ModelSerializer):
    admin_name = serializers.SerializerMethodField()
    admin_email = serializers.EmailField(source='admin.email', read_only=True)

    class Meta:
        model = AuditLog
        fields = '__all__'
        read_only_fields = ['created_at']

    def get_admin_name(self, obj):
        if obj.admin:
            return obj.admin.get_full_name() or obj.admin.email
        return None


class AdminSessionSerializer(serializers.ModelSerializer):
    admin_name = serializers.SerializerMethodField()

    class Meta:
        model = AdminSession
        fields = '__all__'
        read_only_fields = ['login_time']

    def get_admin_name(self, obj):
        if obj.admin:
            return obj.admin.get_full_name() or obj.admin.email
        return None


class NotificationBroadcastSerializer(serializers.Serializer):
    notification_type = serializers.ChoiceField(choices=Notification.Type.choices)
    title = serializers.CharField(max_length=255)
    message = serializers.CharField()
    link = serializers.CharField(max_length=500, required=False, allow_blank=True)
    send_to_all = serializers.BooleanField(default=False)
    recipient_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
    )

    def validate(self, attrs):
        if not attrs.get('send_to_all') and not attrs.get('recipient_ids'):
            raise serializers.ValidationError(
                "Either send_to_all=True or recipient_ids must be provided."
            )
        return attrs


class ExtendSubscriptionSerializer(serializers.Serializer):
    days = serializers.IntegerField(min_value=1, required=True)


class UpgradeDowngradeSerializer(serializers.Serializer):
    plan_id = serializers.PrimaryKeyRelatedField(
        queryset=LicensePlan.objects.filter(is_active=True),
        required=True,
    )


class SubscriptionNotesSerializer(serializers.Serializer):
    notes = serializers.CharField(required=True)


class PaymentApproveSerializer(serializers.Serializer):
    admin_notes = serializers.CharField(required=False, allow_blank=True, default='')


class PaymentRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True)


class PaymentRequestInfoSerializer(serializers.Serializer):
    message = serializers.CharField(required=True)


class ExtendTrialSerializer(serializers.Serializer):
    days = serializers.IntegerField(min_value=1, required=True)


class ConvertTrialSerializer(serializers.Serializer):
    plan_id = serializers.PrimaryKeyRelatedField(
        queryset=LicensePlan.objects.filter(is_active=True),
        required=True,
    )


class SupportTicketCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = ['business', 'subject', 'description', 'priority', 'platform']


class SupportReplyCreateSerializer(serializers.Serializer):
    message = serializers.CharField(required=True)
    is_internal = serializers.BooleanField(default=False)


class SupportTicketAssignSerializer(serializers.Serializer):
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_admin=True),
        required=True,
    )


class SupportTicketNotesSerializer(serializers.Serializer):
    notes = serializers.CharField(required=True)


class AppVersionNotifySerializer(serializers.Serializer):
    message = serializers.CharField(required=False, default='')
