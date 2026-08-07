import logging
from datetime import timedelta, datetime, date

from django.db.models import Count, Sum, Q, Avg, Prefetch
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, TruncYear
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from rest_framework import viewsets, status, permissions, filters, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend

from accounts.models import User
from accounts.permissions import IsAdminUser
from customers.models import CustomerProfile
from licenses.models import License, LicensePlan, DeviceActivation, LicenseAuditLog
from payments.models import Payment, Invoice
from notifications.models import Notification
from admin_api.models import (
    SystemSetting, FeatureFlag, AppVersion,
    SupportTicket, SupportReply, AuditLog, AdminSession,
)
from rest_framework import serializers as drf_serializers

from admin_api.serializers import (
    AdminUserListSerializer, AdminUserCreateSerializer, AdminUserDetailSerializer,
    AdminUserUpdateSerializer,
    BusinessListSerializer, BusinessDetailSerializer,
    SubscriptionListSerializer, SubscriptionDetailSerializer,
    PaymentListSerializer, PaymentDetailSerializer,
    SystemSettingSerializer, FeatureFlagSerializer, AppVersionSerializer,
    SupportTicketListSerializer, SupportTicketDetailSerializer,
    SupportTicketCreateSerializer, SupportReplySerializer,
    SupportReplyCreateSerializer, SupportTicketAssignSerializer,
    SupportTicketNotesSerializer,
    AuditLogSerializer, AdminSessionSerializer,
    NotificationBroadcastSerializer,
    ExtendSubscriptionSerializer, UpgradeDowngradeSerializer,
    SubscriptionNotesSerializer,
    PaymentApproveSerializer, PaymentRejectSerializer, PaymentRequestInfoSerializer,
    ExtendTrialSerializer, ConvertTrialSerializer,
    AppVersionNotifySerializer,
)

logger = logging.getLogger(__name__)
User = get_user_model()


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def log_admin_action(request, action, resource_type, resource_id='', details=None,
                     before_state=None, after_state=None):
    if details is None:
        details = {}
    if before_state is None:
        before_state = {}
    if after_state is None:
        after_state = {}
    try:
        AuditLog.objects.create(
            admin=request.user if request.user.is_authenticated else None,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id),
            details=details,
            before_state=before_state,
            after_state=after_state,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        )
    except Exception as e:
        logger.error(f"Failed to create audit log: {e}")


def parse_date_params(request):
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    filter_kwargs = {}
    if date_from:
        try:
            filter_kwargs['created_at__gte'] = datetime.strptime(date_from, '%Y-%m-%d')
        except ValueError:
            pass
    if date_to:
        try:
            filter_kwargs['created_at__lte'] = datetime.strptime(date_to, '%Y-%m-%d') + timedelta(days=1)
        except ValueError:
            pass
    return filter_kwargs


def apply_filters(queryset, request, extra_fields=None):
    filter_kwargs = parse_date_params(request)
    queryset = queryset.filter(**filter_kwargs)

    status_val = request.query_params.get('status')
    if status_val:
        queryset = queryset.filter(status=status_val)

    plan_val = request.query_params.get('plan')
    if plan_val and hasattr(queryset.model, 'plan_id'):
        queryset = queryset.filter(plan_id=plan_val)

    platform_val = request.query_params.get('platform')
    if platform_val and hasattr(queryset.model, 'platform'):
        queryset = queryset.filter(platform=platform_val)

    search = request.query_params.get('search')
    if search and hasattr(queryset.model, 'search_fields'):
        q_objects = Q()
        for field in getattr(queryset.model, 'search_fields', []):
            q_objects |= Q(**{f"{field}__icontains": search})
        if q_objects:
            queryset = queryset.filter(q_objects)

    ordering = request.query_params.get('ordering')
    if ordering:
        queryset = queryset.order_by(ordering)

    return queryset


class BaseAdminViewMixin:
    permission_classes = [IsAuthenticated, IsAdminUser]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    def check_admin(self, request):
        if not request.user.is_authenticated:
            return False
        return bool(request.user.is_admin or request.user.is_superuser or request.user.is_staff)

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not self.check_admin(request):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Admin access required.")


# ─── DASHBOARD ─────────────────────────────────────────────────────────────────


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def dashboard_view(request):
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today_start.replace(day=1)
    thirty_days_ago = now - timedelta(days=30)
    upcoming_expiry = now + timedelta(days=30)

    total_businesses = User.objects.filter(is_customer=True).count()
    active_businesses = User.objects.filter(
        is_customer=True, is_active=True,
        licenses__status='active',
    ).distinct().count()
    trial_users = License.objects.filter(is_trial=True, status='active').count()
    pending_payments = Payment.objects.filter(status='pending').count()
    active_subscriptions = License.objects.filter(status='active').count()
    expired_subscriptions = License.objects.filter(status='expired').count()

    basic_subscribers = License.objects.filter(
        status='active', plan__name__icontains='basic'
    ).count()
    premium_subscribers = License.objects.filter(
        status='active', plan__name__icontains='premium'
    ).count()

    monthly_revenue = Payment.objects.filter(
        status='approved', created_at__gte=month_start
    ).aggregate(total=Sum('amount'))['total'] or 0

    today_revenue = Payment.objects.filter(
        status='approved', created_at__gte=today_start
    ).aggregate(total=Sum('amount'))['total'] or 0

    renewals_this_month = License.objects.filter(
        status='active',
        updated_at__gte=month_start,
    ).count()

    new_businesses_today = User.objects.filter(
        is_customer=True, date_joined__gte=today_start
    ).count()

    revenue_trend = list(
        Payment.objects.filter(status='approved', created_at__gte=thirty_days_ago)
        .annotate(date=TruncDay('created_at'))
        .values('date')
        .annotate(amount=Sum('amount'))
        .order_by('date')
    )

    sub_growth = list(
        License.objects.filter(created_at__gte=thirty_days_ago)
        .annotate(date=TruncDay('created_at'))
        .values('date')
        .annotate(count=Count('id'))
        .order_by('date')
    )

    total_trials = License.objects.filter(is_trial=True).count()
    converted_trials = License.objects.filter(
        is_trial=False,
        created_at__gte=now - timedelta(days=90),
    ).count()
    trial_conversion_rate = round(
        (converted_trials / total_trials * 100), 2
    ) if total_trials > 0 else 0

    mobile_count = DeviceActivation.objects.filter(
        is_active=True,
        operating_system__in=['Android', 'iOS'],
    ).count()
    desktop_count = DeviceActivation.objects.filter(
        is_active=True,
    ).exclude(
        operating_system__in=['Android', 'iOS'],
    ).count()

    expiring_soon = list(
        License.objects.filter(
            status='active',
            expiry_date__gte=now.date(),
            expiry_date__lte=upcoming_expiry.date(),
        ).select_related('customer', 'plan').order_by('expiry_date')[:10].values(
            'id', 'license_key', 'customer__email', 'plan__name', 'expiry_date'
        )
    )

    recent_activity = list(
        AuditLog.objects.select_related('admin').order_by('-created_at')[:20].values(
            'id', 'admin__email', 'action', 'resource_type', 'resource_id', 'created_at'
        )
    )

    return Response({
        'totalBusinesses': total_businesses,
        'activeBusinesses': active_businesses,
        'trialUsers': trial_users,
        'pendingPayments': pending_payments,
        'activeSubscriptions': active_subscriptions,
        'expiredSubscriptions': expired_subscriptions,
        'basicSubscribers': basic_subscribers,
        'premiumSubscribers': premium_subscribers,
        'monthlyRevenue': float(monthly_revenue),
        'todayRevenue': float(today_revenue),
        'renewalsThisMonth': renewals_this_month,
        'newBusinessesToday': new_businesses_today,
        'revenueTrend': [
            {'date': r['date'].strftime('%Y-%m-%d') if r['date'] else None, 'amount': float(r['amount'])}
            for r in revenue_trend
        ],
        'subscriptionGrowth': [
            {'date': r['date'].strftime('%Y-%m-%d') if r['date'] else None, 'count': r['count']}
            for r in sub_growth
        ],
        'trialConversionRate': trial_conversion_rate,
        'mobileVsDesktop': {'mobile': mobile_count, 'desktop': desktop_count},
        'subscriptionDistribution': {'basic': basic_subscribers, 'premium': premium_subscribers},
        'expiringSoon': [
            {
                'id': e['id'],
                'key': e['license_key'],
                'customer': e['customer__email'],
                'plan': e['plan__name'],
                'expiry': e['expiry_date'].strftime('%Y-%m-%d') if e['expiry_date'] else None,
            }
            for e in expiring_soon
        ],
        'recentActivity': [
            {
                'id': a['id'],
                'admin': a['admin__email'],
                'action': a['action'],
                'resource': a['resource_type'],
                'resourceId': a['resource_id'],
                'time': a['created_at'].isoformat() if a['created_at'] else None,
            }
            for a in recent_activity
        ],
    })


# ─── BUSINESSES ────────────────────────────────────────────────────────────────


class BusinessViewSet(BaseAdminViewMixin, viewsets.ModelViewSet):
    queryset = User.objects.filter(is_customer=True).select_related('customer_profile').prefetch_related('licenses', 'licenses__plan')
    search_fields = ['email', 'phone', 'business_name', 'username', 'first_name', 'last_name']
    filterset_fields = ['is_active', 'business_type', 'email_verified']
    ordering_fields = ['created_at', 'date_joined', 'business_name', 'email']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return BusinessListSerializer
        return BusinessDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.prefetch_related(
            Prefetch('licenses', queryset=License.objects.select_related('plan').order_by('-created_at'))
        )
        return apply_filters(qs, self.request)

    def perform_create(self, serializer):
        instance = serializer.save(is_customer=True)
        CustomerProfile.objects.get_or_create(
            user=instance,
            defaults={'company_name': instance.business_name or instance.email},
        )
        log_admin_action(
            self.request, 'create_business', 'business',
            instance.id, details={'email': instance.email},
        )

    def perform_update(self, serializer):
        before = dict(serializer.instance.__dict__)
        instance = serializer.save()
        after = dict(instance.__dict__)
        log_admin_action(
            self.request, 'update_business', 'business',
            instance.id, details={'email': instance.email},
            before_state=before, after_state=after,
        )

    def perform_destroy(self, instance):
        log_admin_action(
            self.request, 'delete_business', 'business',
            instance.id, details={'email': instance.email},
        )
        instance.is_active = False
        instance.save()

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        business = self.get_object()
        business.is_active = False
        business.save()
        business.licenses.filter(status='active').update(status='suspended')
        log_admin_action(
            request, 'suspend_business', 'business',
            business.id, details={'email': business.email},
        )
        return Response({'detail': 'Business suspended successfully.'})

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        business = self.get_object()
        business.is_active = True
        business.save()
        log_admin_action(
            request, 'activate_business', 'business',
            business.id, details={'email': business.email},
        )
        return Response({'detail': 'Business activated successfully.'})

    @action(detail=True, methods=['post'])
    def delete(self, request, pk=None):
        return self.perform_destroy(self.get_object())

    @action(detail=True, methods=['post'])
    def reset_trial(self, request, pk=None):
        if not request.user.is_superuser:
            return Response(
                {'detail': 'Only super admins can reset trials.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        business = self.get_object()
        trial_licenses = business.licenses.filter(is_trial=True)
        trial_licenses.update(
            status='active',
            start_date=timezone.now().date(),
            expiry_date=timezone.now().date() + timedelta(days=30),
        )
        log_admin_action(
            request, 'reset_trial', 'business',
            business.id, details={'email': business.email},
        )
        return Response({'detail': 'Trial reset successfully.'})

    @action(detail=True, methods=['get'])
    def subscription_history(self, request, pk=None):
        business = self.get_object()
        licenses = business.licenses.select_related('plan').prefetch_related('audit_logs')
        page = self.paginate_queryset(licenses)
        if page is not None:
            serializer = SubscriptionListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = SubscriptionListSerializer(licenses, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def payment_history(self, request, pk=None):
        business = self.get_object()
        payments = business.payments.select_related('plan').order_by('-created_at')
        page = self.paginate_queryset(payments)
        if page is not None:
            serializer = PaymentListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = PaymentListSerializer(payments, many=True)
        return Response(serializer.data)


# ─── SUBSCRIPTIONS ─────────────────────────────────────────────────────────────


class SubscriptionViewSet(BaseAdminViewMixin, viewsets.ReadOnlyModelViewSet):
    queryset = License.objects.select_related('customer', 'plan').prefetch_related('payments', 'audit_logs', 'device_activations')
    serializer_class = SubscriptionListSerializer
    search_fields = ['license_key', 'customer__email', 'customer__username', 'customer__phone']
    filterset_fields = ['status', 'plan', 'is_trial']
    ordering_fields = ['created_at', 'expiry_date', 'start_date', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        return apply_filters(qs, self.request)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return SubscriptionDetailSerializer
        return SubscriptionListSerializer

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        sub = self.get_object()
        if sub.status == 'active':
            return Response({'detail': 'Subscription is already active.'}, status=status.HTTP_400_BAD_REQUEST)
        sub.status = 'active'
        sub.save()
        log_admin_action(request, 'activate_subscription', 'subscription', sub.id,
                         details={'license_key': sub.license_key})
        return Response(SubscriptionListSerializer(sub).data)

    @action(detail=True, methods=['post'])
    def extend(self, request, pk=None):
        sub = self.get_object()
        serializer = ExtendSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        days = serializer.validated_data['days']
        sub.expiry_date += timedelta(days=days)
        if sub.status == 'expired':
            sub.status = 'active'
        sub.save()
        log_admin_action(request, 'extend_subscription', 'subscription', sub.id,
                         details={'license_key': sub.license_key, 'days': days})
        return Response(SubscriptionDetailSerializer(sub).data)

    @action(detail=True, methods=['post'])
    def renew(self, request, pk=None):
        sub = self.get_object()
        duration = sub.plan.duration_months * 30
        sub.start_date = timezone.now().date()
        sub.expiry_date = sub.start_date + timedelta(days=duration)
        sub.status = 'active'
        sub.save()
        LicenseAuditLog.objects.create(
            license=sub, action='renewed',
            details={'renewed_by': request.user.email},
            created_by=request.user,
        )
        log_admin_action(request, 'renew_subscription', 'subscription', sub.id,
                         details={'license_key': sub.license_key})
        return Response(SubscriptionDetailSerializer(sub).data)

    @action(detail=True, methods=['post'])
    def upgrade(self, request, pk=None):
        sub = self.get_object()
        serializer = UpgradeDowngradeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_plan = serializer.validated_data['plan_id']
        if new_plan.price <= sub.plan.price:
            return Response({'detail': 'New plan must have a higher price for upgrade.'},
                            status=status.HTTP_400_BAD_REQUEST)
        old_plan_name = sub.plan.name
        sub.plan = new_plan
        sub.save()
        log_admin_action(request, 'upgrade_subscription', 'subscription', sub.id,
                         details={'license_key': sub.license_key, 'from': old_plan_name, 'to': new_plan.name})
        return Response(SubscriptionDetailSerializer(sub).data)

    @action(detail=True, methods=['post'])
    def downgrade(self, request, pk=None):
        sub = self.get_object()
        serializer = UpgradeDowngradeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_plan = serializer.validated_data['plan_id']
        if new_plan.price >= sub.plan.price:
            return Response({'detail': 'New plan must have a lower price for downgrade.'},
                            status=status.HTTP_400_BAD_REQUEST)
        old_plan_name = sub.plan.name
        sub.plan = new_plan
        sub.save()
        log_admin_action(request, 'downgrade_subscription', 'subscription', sub.id,
                         details={'license_key': sub.license_key, 'from': old_plan_name, 'to': new_plan.name})
        return Response(SubscriptionDetailSerializer(sub).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        sub = self.get_object()
        sub.status = 'revoked'
        sub.save()
        LicenseAuditLog.objects.create(
            license=sub, action='revoked',
            details={'revoked_by': request.user.email, 'reason': request.data.get('reason', '')},
            created_by=request.user,
        )
        log_admin_action(request, 'cancel_subscription', 'subscription', sub.id,
                         details={'license_key': sub.license_key})
        return Response(SubscriptionDetailSerializer(sub).data)

    @action(detail=True, methods=['post'])
    def expire(self, request, pk=None):
        sub = self.get_object()
        sub.status = 'expired'
        sub.expiry_date = timezone.now().date()
        sub.save()
        LicenseAuditLog.objects.create(
            license=sub, action='expired',
            details={'expired_by': request.user.email},
            created_by=request.user,
        )
        log_admin_action(request, 'expire_subscription', 'subscription', sub.id,
                         details={'license_key': sub.license_key})
        return Response(SubscriptionDetailSerializer(sub).data)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        sub = self.get_object()
        sub.status = 'active'
        sub.save()
        LicenseAuditLog.objects.create(
            license=sub, action='activated',
            details={'restored_by': request.user.email},
            created_by=request.user,
        )
        log_admin_action(request, 'restore_subscription', 'subscription', sub.id,
                         details={'license_key': sub.license_key})
        return Response(SubscriptionDetailSerializer(sub).data)

    @action(detail=True, methods=['post'])
    def notes(self, request, pk=None):
        sub = self.get_object()
        serializer = SubscriptionNotesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sub.notes = serializer.validated_data['notes']
        sub.save()
        log_admin_action(request, 'update_subscription_notes', 'subscription', sub.id,
                         details={'license_key': sub.license_key})
        return Response(SubscriptionDetailSerializer(sub).data)


# ─── PAYMENTS ──────────────────────────────────────────────────────────────────


class PaymentViewSet(BaseAdminViewMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Payment.objects.select_related('customer', 'license', 'plan', 'reviewed_by')
    search_fields = ['transaction_id', 'customer__email', 'customer__username', 'customer__phone']
    filterset_fields = ['status', 'payment_method']
    ordering_fields = ['created_at', 'amount', 'reviewed_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PaymentDetailSerializer
        return PaymentListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        return apply_filters(qs, self.request)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        payment = self.get_object()
        if payment.status != 'pending':
            return Response({'detail': 'Only pending payments can be approved.'},
                            status=status.HTTP_400_BAD_REQUEST)
        serializer = PaymentApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment.status = 'approved'
        payment.admin_notes = serializer.validated_data.get('admin_notes', '')
        payment.reviewed_by = request.user
        payment.reviewed_at = timezone.now()
        payment.save()

        from payments.utils import process_approved_payment
        process_approved_payment(payment)

        Notification.objects.create(
            recipient=payment.customer,
            notification_type='payment_approved',
            title='Payment Approved',
            message=f'Your payment of {payment.amount} has been approved.',
        )
        log_admin_action(request, 'approve_payment', 'payment', payment.id,
                         details={'transaction_id': payment.transaction_id, 'amount': str(payment.amount)})
        return Response(PaymentDetailSerializer(payment).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        payment = self.get_object()
        if payment.status != 'pending':
            return Response({'detail': 'Only pending payments can be rejected.'},
                            status=status.HTTP_400_BAD_REQUEST)
        serializer = PaymentRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment.status = 'rejected'
        payment.admin_notes = serializer.validated_data['reason']
        payment.reviewed_by = request.user
        payment.reviewed_at = timezone.now()
        payment.save()

        Notification.objects.create(
            recipient=payment.customer,
            notification_type='payment_rejected',
            title='Payment Rejected',
            message=f'Your payment has been rejected. Reason: {serializer.validated_data["reason"]}',
        )
        log_admin_action(request, 'reject_payment', 'payment', payment.id,
                         details={'transaction_id': payment.transaction_id, 'reason': serializer.validated_data['reason']})
        return Response(PaymentDetailSerializer(payment).data)

    @action(detail=True, methods=['post'])
    def request_info(self, request, pk=None):
        payment = self.get_object()
        serializer = PaymentRequestInfoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        Notification.objects.create(
            recipient=payment.customer,
            notification_type='system',
            title='Additional Information Required',
            message=serializer.validated_data['message'],
        )
        log_admin_action(request, 'request_payment_info', 'payment', payment.id,
                         details={'transaction_id': payment.transaction_id, 'message': serializer.validated_data['message']})
        return Response({'detail': 'Information request sent to customer.'})

    @action(detail=False, methods=['get'])
    def search(self, request):
        q = request.query_params.get('q', '')
        if not q:
            return Response({'results': []})
        payments = self.get_queryset().filter(
            Q(transaction_id__icontains=q) |
            Q(customer__email__icontains=q) |
            Q(customer__username__icontains=q) |
            Q(customer__phone__icontains=q)
        )[:50]
        serializer = PaymentListSerializer(payments, many=True)
        return Response({'results': serializer.data})


# ─── TRIALS ────────────────────────────────────────────────────────────────────


class TrialViewSet(BaseAdminViewMixin, viewsets.ReadOnlyModelViewSet):
    queryset = License.objects.filter(is_trial=True).select_related('customer', 'plan')
    serializer_class = SubscriptionListSerializer
    search_fields = ['license_key', 'customer__email', 'customer__username']
    filterset_fields = ['status']
    ordering_fields = ['created_at', 'expiry_date']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        return apply_filters(qs, self.request)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return SubscriptionDetailSerializer
        return SubscriptionListSerializer

    @action(detail=True, methods=['post'])
    def extend(self, request, pk=None):
        trial = self.get_object()
        serializer = ExtendTrialSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        trial.expiry_date += timedelta(days=serializer.validated_data['days'])
        if trial.status == 'expired':
            trial.status = 'active'
        trial.save()
        log_admin_action(request, 'extend_trial', 'trial', trial.id,
                         details={'license_key': trial.license_key, 'days': serializer.validated_data['days']})
        return Response(SubscriptionDetailSerializer(trial).data)

    @action(detail=True, methods=['post'])
    def end(self, request, pk=None):
        trial = self.get_object()
        trial.expiry_date = timezone.now().date()
        trial.status = 'expired'
        trial.save()
        log_admin_action(request, 'end_trial', 'trial', trial.id,
                         details={'license_key': trial.license_key})
        return Response({'detail': 'Trial ended successfully.'})

    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        trial = self.get_object()
        serializer = ConvertTrialSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_plan = serializer.validated_data['plan_id']
        old_plan_name = trial.plan.name
        trial.plan = new_plan
        trial.is_trial = False
        trial.status = 'active'
        trial.start_date = timezone.now().date()
        trial.expiry_date = trial.start_date + timedelta(days=new_plan.duration_months * 30)
        trial.save()
        LicenseAuditLog.objects.create(
            license=trial, action='renewed',
            details={'converted_from_trial': True, 'from_plan': old_plan_name, 'to_plan': new_plan.name},
            created_by=request.user,
        )
        log_admin_action(request, 'convert_trial', 'trial', trial.id,
                         details={'license_key': trial.license_key, 'to_plan': new_plan.name})
        return Response(SubscriptionDetailSerializer(trial).data)

    @action(detail=True, methods=['post'])
    def reset(self, request, pk=None):
        if not request.user.is_superuser:
            return Response({'detail': 'Only super admins can reset trials.'},
                            status=status.HTTP_403_FORBIDDEN)
        trial = self.get_object()
        trial.start_date = timezone.now().date()
        trial.expiry_date = trial.start_date + timedelta(days=30)
        trial.status = 'active'
        trial.save()
        log_admin_action(request, 'reset_trial', 'trial', trial.id,
                         details={'license_key': trial.license_key})
        return Response({'detail': 'Trial reset successfully.'})


# ─── REVENUE ───────────────────────────────────────────────────────────────────


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def revenue_overview(request):
    period = request.query_params.get('period', 'monthly')
    now = timezone.now()

    trunc_fn = {'daily': TruncDay, 'weekly': TruncWeek, 'monthly': TruncMonth, 'annual': TruncYear}
    trunc = trunc_fn.get(period, TruncMonth)

    start_dates = {
        'daily': now - timedelta(days=30),
        'weekly': now - timedelta(weeks=12),
        'monthly': now - timedelta(days=365),
        'annual': now - timedelta(days=365 * 5),
    }
    start = start_dates.get(period, now - timedelta(days=365))

    revenue_data = (
        Payment.objects.filter(status='approved', created_at__gte=start)
        .annotate(period_date=trunc('created_at'))
        .values('period_date')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('period_date')
    )

    total_revenue = Payment.objects.filter(status='approved').aggregate(total=Sum('amount'))['total'] or 0
    total_count = Payment.objects.filter(status='approved').count()

    return Response({
        'period': period,
        'total_revenue': float(total_revenue),
        'total_transactions': total_count,
        'data': [
            {
                'date': r['period_date'].strftime('%Y-%m-%d') if r['period_date'] else None,
                'amount': float(r['total']),
                'count': r['count'],
            }
            for r in revenue_data
        ],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def revenue_by_platform(request):
    data = (
        DeviceActivation.objects.filter(is_active=True)
        .values('operating_system')
        .annotate(count=Count('id'))
    )
    return Response({'data': list(data)})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def revenue_by_plan(request):
    data = (
        Payment.objects.filter(status='approved')
        .values('plan__name')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('-total')
    )
    return Response({
        'data': [
            {'plan': r['plan__name'] or 'Unknown', 'total': float(r['total']), 'count': r['count']}
            for r in data
        ]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def revenue_by_method(request):
    data = (
        Payment.objects.filter(status='approved')
        .values('payment_method')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('-total')
    )
    return Response({
        'data': [
            {'method': r['payment_method'], 'total': float(r['total']), 'count': r['count']}
            for r in data
        ]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def revenue_renewals(request):
    now = timezone.now()
    twelve_months_ago = now - timedelta(days=365)

    data = (
        LicenseAuditLog.objects.filter(
            action='renewed', created_at__gte=twelve_months_ago,
        )
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )
    return Response({
        'data': [
            {'month': r['month'].strftime('%Y-%m') if r['month'] else None, 'count': r['count']}
            for r in data
        ]
    })


# ─── ADMINS ────────────────────────────────────────────────────────────────────


class AdminUserViewSet(BaseAdminViewMixin, viewsets.ModelViewSet):
    queryset = User.objects.filter(is_admin=True).order_by('-date_joined')
    search_fields = ['email', 'username', 'phone', 'first_name', 'last_name']
    filterset_fields = ['is_active', 'is_superuser']
    ordering_fields = ['date_joined', 'last_login', 'email']
    ordering = ['-date_joined']

    def get_serializer_class(self):
        if self.action == 'create':
            return AdminUserCreateSerializer
        elif self.action in ('update', 'partial_update'):
            return AdminUserUpdateSerializer
        elif self.action == 'retrieve':
            return AdminUserDetailSerializer
        return AdminUserListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        return apply_filters(qs, self.request)

    def perform_create(self, serializer):
        instance = serializer.save()
        log_admin_action(self.request, 'create_admin', 'admin', instance.id,
                         details={'email': instance.email})

    def perform_update(self, serializer):
        before = dict(serializer.instance.__dict__)
        instance = serializer.save()
        after = dict(instance.__dict__)
        log_admin_action(self.request, 'update_admin', 'admin', instance.id,
                         details={'email': instance.email},
                         before_state=before, after_state=after)

    def perform_destroy(self, instance):
        log_admin_action(self.request, 'delete_admin', 'admin', instance.id,
                         details={'email': instance.email})
        instance.is_active = False
        instance.save()

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        admin = self.get_object()
        admin.is_active = False
        admin.save()
        log_admin_action(request, 'suspend_admin', 'admin', admin.id,
                         details={'email': admin.email})
        return Response({'detail': 'Admin suspended successfully.'})

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        admin = self.get_object()
        new_password = request.data.get('new_password')
        if not new_password or len(new_password) < 8:
            return Response({'detail': 'Password must be at least 8 characters.'},
                            status=status.HTTP_400_BAD_REQUEST)
        admin.set_password(new_password)
        admin.save()
        log_admin_action(request, 'reset_admin_password', 'admin', admin.id,
                         details={'email': admin.email})
        return Response({'detail': 'Password reset successfully.'})

    @action(detail=True, methods=['get'])
    def login_history(self, request, pk=None):
        admin = self.get_object()
        sessions = AdminSession.objects.filter(admin=admin).order_by('-login_time')
        page = self.paginate_queryset(sessions)
        if page is not None:
            serializer = AdminSessionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = AdminSessionSerializer(sessions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def activity(self, request, pk=None):
        admin = self.get_object()
        logs = AuditLog.objects.filter(admin=admin).order_by('-created_at')
        page = self.paginate_queryset(logs)
        if page is not None:
            serializer = AuditLogSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)


# ─── NOTIFICATIONS ─────────────────────────────────────────────────────────────


class AdminNotificationViewSet(BaseAdminViewMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Notification.objects.select_related('recipient').all()
    serializer_class = drf_serializers.Serializer
    search_fields = ['recipient__email', 'title', 'message']
    filterset_fields = ['notification_type', 'is_read']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return apply_filters(super().get_queryset(), self.request)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            from notifications.serializers import NotificationSerializer
            serializer = NotificationSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        from notifications.serializers import NotificationSerializer
        serializer = NotificationSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def send(self, request):
        serializer = NotificationBroadcastSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        recipients = []
        if serializer.validated_data.get('send_to_all'):
            recipients = User.objects.filter(is_customer=True)
        else:
            recipient_ids = serializer.validated_data.get('recipient_ids', [])
            recipients = User.objects.filter(id__in=recipient_ids)

        notifications = [
            Notification(
                recipient=user,
                notification_type=serializer.validated_data['notification_type'],
                title=serializer.validated_data['title'],
                message=serializer.validated_data['message'],
                link=serializer.validated_data.get('link', ''),
            )
            for user in recipients
        ]
        Notification.objects.bulk_create(notifications)

        log_admin_action(request, 'broadcast_notification', 'notification', '',
                         details={'count': len(notifications), 'title': serializer.validated_data['title']})
        return Response({'detail': f'Notification sent to {len(notifications)} recipients.'})

    @action(detail=False, methods=['get'])
    def history(self, request):
        return self.list(request)


# ─── SUPPORT TICKETS ───────────────────────────────────────────────────────────


class SupportTicketViewSet(BaseAdminViewMixin, viewsets.ModelViewSet):
    queryset = SupportTicket.objects.select_related(
        'business', 'assigned_to'
    ).prefetch_related('replies')
    search_fields = ['subject', 'description', 'business__email', 'business__username']
    filterset_fields = ['status', 'priority', 'platform', 'assigned_to']
    ordering_fields = ['created_at', 'updated_at', 'priority']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return SupportTicketCreateSerializer
        elif self.action == 'retrieve':
            return SupportTicketDetailSerializer
        return SupportTicketListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        return apply_filters(qs, self.request)

    def perform_create(self, serializer):
        instance = serializer.save()
        log_admin_action(self.request, 'create_ticket', 'support_ticket', instance.id,
                         details={'subject': instance.subject})

    def perform_update(self, serializer):
        instance = serializer.save()
        log_admin_action(self.request, 'update_ticket', 'support_ticket', instance.id,
                         details={'subject': instance.subject})

    @action(detail=True, methods=['post'])
    def reply(self, request, pk=None):
        ticket = self.get_object()
        serializer = SupportReplyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reply = SupportReply.objects.create(
            ticket=ticket,
            admin=request.user,
            message=serializer.validated_data['message'],
            is_internal=serializer.validated_data.get('is_internal', False),
        )
        ticket.status = SupportTicket.Status.IN_PROGRESS
        ticket.save()
        log_admin_action(request, 'reply_ticket', 'support_ticket', ticket.id,
                         details={'is_internal': serializer.validated_data.get('is_internal', False)})
        return Response(SupportReplySerializer(reply).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        ticket = self.get_object()
        ticket.status = SupportTicket.Status.CLOSED
        ticket.save()
        log_admin_action(request, 'close_ticket', 'support_ticket', ticket.id,
                         details={'subject': ticket.subject})
        return Response({'detail': 'Ticket closed.'})

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        ticket = self.get_object()
        serializer = SupportTicketAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket.assigned_to = serializer.validated_data['assigned_to']
        ticket.status = SupportTicket.Status.IN_PROGRESS
        ticket.save()
        log_admin_action(request, 'assign_ticket', 'support_ticket', ticket.id,
                         details={'assigned_to': ticket.assigned_to.email})
        return Response(SupportTicketDetailSerializer(ticket).data)

    @action(detail=True, methods=['post'])
    def escalate(self, request, pk=None):
        ticket = self.get_object()
        ticket.priority = SupportTicket.Priority.URGENT
        ticket.save()
        log_admin_action(request, 'escalate_ticket', 'support_ticket', ticket.id,
                         details={'subject': ticket.subject})
        return Response({'detail': 'Ticket escalated to urgent.'})

    @action(detail=True, methods=['post'])
    def notes(self, request, pk=None):
        ticket = self.get_object()
        serializer = SupportTicketNotesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        SupportReply.objects.create(
            ticket=ticket,
            admin=request.user,
            message=serializer.validated_data['notes'],
            is_internal=True,
        )
        log_admin_action(request, 'add_ticket_notes', 'support_ticket', ticket.id)
        return Response({'detail': 'Internal notes added.'})


# ─── ANALYTICS ─────────────────────────────────────────────────────────────────


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def analytics_overview(request):
    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)

    new_businesses = User.objects.filter(is_customer=True, date_joined__gte=thirty_days_ago).count()
    active_subs = License.objects.filter(status='active').count()
    pending_payments = Payment.objects.filter(status='pending').count()
    total_revenue = Payment.objects.filter(status='approved', created_at__gte=thirty_days_ago).aggregate(
        total=Sum('amount')
    )['total'] or 0

    return Response({
        'newBusinesses': new_businesses,
        'activeSubscriptions': active_subs,
        'pendingPayments': pending_payments,
        'revenue30Days': float(total_revenue),
        'period': 'last_30_days',
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def analytics_active_businesses(request):
    data = (
        License.objects.filter(status='active')
        .values('customer__email', 'customer__business_name')
        .annotate(license_count=Count('id'), last_activity=Count('device_activations'))
        .order_by('-last_activity')[:20]
    )
    return Response({
        'data': [
            {
                'email': r['customer__email'],
                'business_name': r['customer__business_name'],
                'license_count': r['license_count'],
                'activity_score': r['last_activity'],
            }
            for r in data
        ]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def analytics_features(request):
    data = DeviceActivation.objects.values('operating_system').annotate(
        count=Count('id', distinct=True)
    ).order_by('-count')
    return Response({'data': list(data)})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def analytics_retention(request):
    now = timezone.now()
    data = []
    for months in [1, 3, 6, 12]:
        start = now - timedelta(days=months * 30)
        total = User.objects.filter(is_customer=True, date_joined__lte=start).count()
        retained = User.objects.filter(
            is_customer=True,
            date_joined__lte=start,
            licenses__status='active',
        ).distinct().count()
        rate = round((retained / total * 100), 2) if total > 0 else 0
        data.append({'period': f'{months}mo', 'total': total, 'retained': retained, 'rate': rate})
    return Response({'data': data})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def analytics_mrr(request):
    now = timezone.now()

    active_subs = License.objects.filter(status='active').count()
    total_monthly = (
        License.objects.filter(status='active')
        .annotate(monthly_price=Sum('plan__price'))
        .aggregate(total=Sum('plan__price'))['total'] or 0
    )
    mrr = float(total_monthly)
    total_customers = User.objects.filter(is_customer=True).count()
    arpu = round(mrr / total_customers, 2) if total_customers > 0 else 0
    ltv = round(arpu * 12, 2)

    total_trials = License.objects.filter(is_trial=True).count()
    converted = License.objects.filter(is_trial=False).exclude(
        id__in=License.objects.filter(is_trial=False, created_at__gte=now - timedelta(days=90))
    ).count() if total_trials > 0 else 0
    conversion_rate = round((converted / total_trials * 100), 2) if total_trials > 0 else 0

    return Response({
        'mrr': mrr,
        'arpu': arpu,
        'ltv': ltv,
        'activeSubscribers': active_subs,
        'totalCustomers': total_customers,
        'trialConversionRate': conversion_rate,
    })


# ─── FEATURE FLAGS ─────────────────────────────────────────────────────────────


class FeatureFlagViewSet(BaseAdminViewMixin, viewsets.ModelViewSet):
    queryset = FeatureFlag.objects.all()
    serializer_class = FeatureFlagSerializer
    search_fields = ['name', 'code', 'description']
    filterset_fields = ['enabled', 'is_beta']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return apply_filters(super().get_queryset(), self.request)

    def perform_create(self, serializer):
        instance = serializer.save()
        log_admin_action(self.request, 'create_feature_flag', 'feature_flag', instance.id,
                         details={'code': instance.code})

    def perform_update(self, serializer):
        instance = serializer.save()
        log_admin_action(self.request, 'update_feature_flag', 'feature_flag', instance.id,
                         details={'code': instance.code, 'enabled': instance.enabled})


# ─── APP VERSIONS ──────────────────────────────────────────────────────────────


class AppVersionViewSet(BaseAdminViewMixin, viewsets.ModelViewSet):
    queryset = AppVersion.objects.all()
    serializer_class = AppVersionSerializer
    search_fields = ['version', 'platform', 'release_notes']
    filterset_fields = ['platform', 'is_force_update']
    ordering_fields = ['created_at', 'version']
    ordering = ['-created_at']

    def get_queryset(self):
        return apply_filters(super().get_queryset(), self.request)

    def perform_create(self, serializer):
        instance = serializer.save()
        log_admin_action(self.request, 'create_app_version', 'app_version', instance.id,
                         details={'platform': instance.platform, 'version': instance.version})

    def perform_update(self, serializer):
        instance = serializer.save()
        log_admin_action(self.request, 'update_app_version', 'app_version', instance.id,
                         details={'platform': instance.platform, 'version': instance.version})

    @action(detail=True, methods=['post'])
    def notify(self, request, pk=None):
        version = self.get_object()
        serializer = AppVersionNotifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        customers = User.objects.filter(is_customer=True)
        msg = serializer.validated_data.get('message') or f'New version {version.version} available for {version.platform}.'
        notifications = [
            Notification(
                recipient=user,
                notification_type='system',
                title=f'Update Available: v{version.version}',
                message=msg,
                link=version.download_url,
            )
            for user in customers
        ]
        Notification.objects.bulk_create(notifications)
        log_admin_action(request, 'notify_app_version', 'app_version', version.id,
                         details={'platform': version.platform, 'version': version.version})
        return Response({'detail': f'Notified {len(notifications)} users about update.'})


# ─── SETTINGS ──────────────────────────────────────────────────────────────────


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated, IsAdminUser])
def system_settings(request):
    if request.method == 'GET':
        settings_list = SystemSetting.objects.all().order_by('key')
        serializer = SystemSettingSerializer(settings_list, many=True)
        return Response({'settings': serializer.data})

    data = request.data
    if isinstance(data, list):
        for item in data:
            key = item.get('key')
            if key:
                SystemSetting.objects.update_or_create(
                    key=key,
                    defaults={
                        'value': item.get('value', ''),
                        'type': item.get('type', 'string'),
                        'description': item.get('description', ''),
                    },
                )
        log_admin_action(request, 'update_settings', 'system_settings', '',
                         details={'count': len(data)})
        return Response({'detail': f'{len(data)} settings updated.'})
    else:
        key = data.get('key')
        if not key:
            return Response({'detail': 'key is required.'}, status=status.HTTP_400_BAD_REQUEST)
        SystemSetting.objects.update_or_create(
            key=key,
            defaults={
                'value': data.get('value', ''),
                'type': data.get('type', 'string'),
                'description': data.get('description', ''),
            },
        )
        log_admin_action(request, 'update_setting', 'system_settings', key)
        return Response({'detail': f'Setting "{key}" updated.'})


# ─── AUDIT LOGS ────────────────────────────────────────────────────────────────


class AuditLogViewSet(BaseAdminViewMixin, viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('admin').all()
    serializer_class = AuditLogSerializer
    search_fields = ['action', 'resource_type', 'resource_id', 'admin__email', 'admin__username']
    filterset_fields = ['action', 'resource_type']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return apply_filters(super().get_queryset(), self.request)


# ─── REPORTS ───────────────────────────────────────────────────────────────────


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def report_revenue(request):
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    period = request.query_params.get('period', 'monthly')

    trunc_fn = {'daily': TruncDay, 'weekly': TruncWeek, 'monthly': TruncMonth, 'annual': TruncYear}
    trunc = trunc_fn.get(period, TruncMonth)

    qs = Payment.objects.filter(status='approved')
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__lte=date_to + 'T23:59:59')

    data = (
        qs.annotate(period_date=trunc('created_at'))
        .values('period_date')
        .annotate(
            total=Sum('amount'),
            count=Count('id'),
            avg=Avg('amount'),
        )
        .order_by('period_date')
    )

    return Response({
        'report': 'revenue',
        'period': period,
        'data': [
            {
                'date': r['period_date'].strftime('%Y-%m-%d') if r['period_date'] else None,
                'total': float(r['total']),
                'count': r['count'],
                'average': float(r['avg']) if r['avg'] else 0,
            }
            for r in data
        ]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def report_businesses(request):
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')

    qs = User.objects.filter(is_customer=True)
    if date_from:
        qs = qs.filter(date_joined__gte=date_from)
    if date_to:
        qs = qs.filter(date_joined__lte=date_to + 'T23:59:59')

    total = qs.count()
    active = qs.filter(is_active=True).count()
    with_licenses = qs.filter(licenses__isnull=False).distinct().count()

    growth = (
        qs.annotate(month=TruncMonth('date_joined'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )

    return Response({
        'report': 'businesses',
        'total': total,
        'active': active,
        'with_subscriptions': with_licenses,
        'growth': [
            {'month': r['month'].strftime('%Y-%m') if r['month'] else None, 'count': r['count']}
            for r in growth
        ],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def report_subscriptions(request):
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')

    qs = License.objects.all()
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__lte=date_to + 'T23:59:59')

    by_status = qs.values('status').annotate(count=Count('id')).order_by('status')
    by_plan = qs.values('plan__name').annotate(count=Count('id')).order_by('-count')

    return Response({
        'report': 'subscriptions',
        'total': qs.count(),
        'by_status': list(by_status),
        'by_plan': [
            {'plan': r['plan__name'] or 'Unknown', 'count': r['count']}
            for r in by_plan
        ],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def report_payments(request):
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')

    qs = Payment.objects.all()
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__lte=date_to + 'T23:59:59')

    by_status = qs.values('status').annotate(
        count=Count('id'), total=Sum('amount')
    ).order_by('status')

    by_method = qs.values('payment_method').annotate(
        count=Count('id'), total=Sum('amount')
    ).order_by('-total')

    return Response({
        'report': 'payments',
        'total': qs.count(),
        'total_amount': float(qs.aggregate(total=Sum('amount'))['total'] or 0),
        'by_status': [
            {'status': r['status'], 'count': r['count'], 'total': float(r['total'] or 0)}
            for r in by_status
        ],
        'by_method': [
            {'method': r['payment_method'], 'count': r['count'], 'total': float(r['total'] or 0)}
            for r in by_method
        ],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def report_trials(request):
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')

    qs = License.objects.filter(is_trial=True)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__lte=date_to + 'T23:59:59')

    by_status = qs.values('status').annotate(count=Count('id')).order_by('status')
    converted = qs.exclude(status='active', is_trial=True).count() if not date_from else 0

    return Response({
        'report': 'trials',
        'total': qs.count(),
        'converted': converted,
        'by_status': list(by_status),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def report_renewals(request):
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')

    qs = LicenseAuditLog.objects.filter(action='renewed')
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__lte=date_to + 'T23:59:59')

    by_month = (
        qs.annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )

    return Response({
        'report': 'renewals',
        'total': qs.count(),
        'by_month': [
            {'month': r['month'].strftime('%Y-%m') if r['month'] else None, 'count': r['count']}
            for r in by_month
        ],
    })


# ─── GLOBAL SEARCH ─────────────────────────────────────────────────────────────


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def global_search(request):
    q = request.query_params.get('q', '').strip()
    if not q:
        return Response({'results': []})

    results = {
        'businesses': [],
        'payments': [],
        'subscriptions': [],
        'transactions': [],
        'users': [],
    }

    businesses = User.objects.filter(is_customer=True).filter(
        Q(email__icontains=q) | Q(phone__icontains=q) |
        Q(business_name__icontains=q) | Q(username__icontains=q)
    )[:10]
    results['businesses'] = BusinessListSerializer(businesses, many=True).data

    payments = Payment.objects.filter(
        Q(transaction_id__icontains=q) | Q(customer__email__icontains=q)
    )[:10]
    results['payments'] = PaymentListSerializer(payments, many=True).data

    subs = License.objects.filter(
        Q(license_key__icontains=q) | Q(customer__email__icontains=q)
    )[:10]
    results['subscriptions'] = SubscriptionListSerializer(subs, many=True).data

    users = User.objects.filter(
        Q(email__icontains=q) | Q(username__icontains=q) | Q(phone__icontains=q)
    )[:10]
    results['users'] = AdminUserListSerializer(users, many=True).data

    return Response(results)
