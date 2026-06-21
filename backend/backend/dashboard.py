from django.db.models import Count, Sum, Q
from django.utils import timezone
from django.db.models.functions import TruncMonth
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from datetime import timedelta

from accounts.models import User
from licenses.models import License, DeviceActivation, LicensePlan
from payments.models import Payment


@api_view(['GET'])
@permission_classes([IsAdminUser])
def dashboard_stats(request):
    now = timezone.now()
    thirty_days = now - timedelta(days=30)
    upcoming_expiry = now + timedelta(days=30)

    total_customers = User.objects.filter(is_customer=True).count()
    active_licenses = License.objects.filter(status='active').count()
    expired_licenses = License.objects.filter(status='expired').count()
    total_licenses = License.objects.count()

    total_revenue = Payment.objects.filter(status='approved').aggregate(
        total=Sum('amount')
    )['total'] or 0

    monthly_revenue = Payment.objects.filter(
        status='approved', created_at__gte=thirty_days
    ).aggregate(total=Sum('amount'))['total'] or 0

    renewals_due = License.objects.filter(
        status='active', expiry_date__lte=upcoming_expiry
    ).count()

    total_activations = DeviceActivation.objects.filter(is_active=True).count()

    pending_payments = Payment.objects.filter(status='pending').count()
    approved_payments = Payment.objects.filter(status='approved').count()
    rejected_payments = Payment.objects.filter(status='rejected').count()

    recent_customers = User.objects.filter(is_customer=True).order_by('-date_joined')[:10].values(
        'id', 'email', 'phone', 'business_name', 'date_joined'
    )

    revenue_trend = list(
        Payment.objects.filter(status='approved')
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(total=Sum('amount'))
        .order_by('month')[:12]
    )

    license_growth = list(
        License.objects.annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')[:12]
    )

    customer_growth = list(
        User.objects.filter(is_customer=True)
        .annotate(month=TruncMonth('date_joined'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')[:12]
    )

    return Response({
        'metrics': {
            'total_customers': total_customers,
            'active_licenses': active_licenses,
            'expired_licenses': expired_licenses,
            'total_licenses': total_licenses,
            'total_revenue': float(total_revenue),
            'monthly_revenue': float(monthly_revenue),
            'renewals_due': renewals_due,
            'total_activations': total_activations,
            'pending_payments': pending_payments,
            'approved_payments': approved_payments,
            'rejected_payments': rejected_payments,
        },
        'revenue_trend': [
            {'month': r['month'].strftime('%Y-%m') if r['month'] else None, 'total': float(r['total'])}
            for r in revenue_trend
        ],
        'license_growth': [
            {'month': r['month'].strftime('%Y-%m') if r['month'] else None, 'count': r['count']}
            for r in license_growth
        ],
        'customer_growth': [
            {'month': r['month'].strftime('%Y-%m') if r['month'] else None, 'count': r['count']}
            for r in customer_growth
        ],
        'recent_customers': [
            {
                'id': c['id'],
                'email': c['email'],
                'phone': c['phone'],
                'business_name': c['business_name'],
                'date_joined': c['date_joined'].isoformat() if c['date_joined'] else None,
            }
            for c in recent_customers
        ],
    })
