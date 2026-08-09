from django.utils import timezone

from datetime import timedelta

from django.utils import timezone

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from payments.models import Payment, Invoice
from payments.serializers import (
    PaymentSerializer,
    PaymentCreateSerializer,
    PaymentReviewSerializer,
    InvoiceSerializer,
    InvoiceCreateSerializer,
)
from payments.utils import process_approved_payment


class IsAdminOrCustomerReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if view.action in ("create",):
            return request.user.is_customer or request.user.is_staff
        if view.action in ("review",):
            return request.user.is_staff
        return True

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        if view.action in ("retrieve",):
            return obj.customer == request.user
        return False


class IsAdminOrCustomerList(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if view.action in ("create", "update", "partial_update", "destroy"):
            return request.user.is_staff
        return True

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        if view.action in ("retrieve",):
            return obj.customer == request.user
        return False


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related(
        "customer", "license", "plan", "reviewed_by"
    ).all()
    permission_classes = [IsAdminOrCustomerReadOnly]
    filterset_fields = ["status", "payment_method"]
    search_fields = ["transaction_id", "customer__email"]
    ordering_fields = ["created_at", "amount"]

    def get_serializer_class(self):
        if self.action == "create":
            return PaymentCreateSerializer
        if self.action == "review":
            return PaymentReviewSerializer
        return PaymentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            qs = qs.filter(customer=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)

    @action(detail=True, methods=["post"], url_path="review")
    def review(self, request, pk=None):
        payment = self.get_object()
        if payment.status != "pending":
            return Response(
                {"detail": "Only pending payments can be reviewed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment.status = serializer.validated_data["status"]
        payment.admin_notes = serializer.validated_data.get("admin_notes", "")
        payment.reviewed_by = request.user
        payment.reviewed_at = timezone.now()
        payment.save()

        if payment.status == "approved":
            process_approved_payment(payment)

        return Response(PaymentSerializer(payment).data)

    @action(detail=False, methods=["get"], url_path="my-payments")
    def my_payments(self, request):
        qs = self.get_queryset().filter(customer=request.user)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related("customer", "payment", "license").all()
    permission_classes = [IsAdminOrCustomerList]
    filterset_fields = ["status"]
    search_fields = ["invoice_number", "customer__email"]
    ordering_fields = ["created_at", "due_date", "amount"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return InvoiceCreateSerializer
        return InvoiceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            qs = qs.filter(customer=self.request.user)
        return qs


class MobilePaymentCreateView(APIView):
    """Mobile-facing endpoint for Telebirr-based payment submissions.

    Accepts a plan and the user's Telebirr transaction reference and records a
    pending Payment that admins later approve/reject in the admin dashboard.
    """
    permission_classes = [permissions.IsAuthenticated]

    # Limit a single account to 3 payment submissions per rolling day.
    DAILY_SUBMISSION_LIMIT = 3

    def post(self, request):
        from licenses.models import LicensePlan
        from accounts.security_log import log_security_event

        plan_id = request.data.get('plan_id')
        transaction_id = (request.data.get('transaction_id') or '').strip()
        ip_address = request.META.get('REMOTE_ADDR', '0.0.0.0')

        if not plan_id:
            return Response({'plan_id': ['This field is required.']}, status=status.HTTP_400_BAD_REQUEST)
        if not transaction_id:
            return Response({'transaction_id': ['This field is required.']}, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = LicensePlan.objects.get(pk=plan_id, is_active=True)
        except LicensePlan.DoesNotExist:
            return Response({'plan_id': ['Invalid plan selected.']}, status=status.HTTP_400_BAD_REQUEST)

        # 1) Duplicate transaction id guard (user may only submit a given ref once).
        if Payment.objects.filter(customer=request.user, transaction_id=transaction_id).exists():
            log_security_event(
                "payment_duplicate_transaction",
                level="info",
                user=request.user.email,
                plan=plan.name,
                ip=ip_address,
            )
            return Response(
                {'transaction_id': ['This transaction number has already been submitted.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2) Daily submission cap per account (rolling 24h window).
        day_ago = timezone.now() - timedelta(hours=24)
        submissions_today = Payment.objects.filter(
            customer=request.user, created_at__gte=day_ago
        ).count()
        if submissions_today >= self.DAILY_SUBMISSION_LIMIT:
            log_security_event(
                "payment_daily_limit",
                level="warning",
                user=request.user.email,
                plan=plan.name,
                count=submissions_today,
                ip=ip_address,
            )
            return Response(
                {
                    'detail': (
                        f'You may submit a maximum of {self.DAILY_SUBMISSION_LIMIT} '
                        'payments per day. Please wait before submitting again.'
                    ),
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # 3) No second *pending* payment for the same plan while one awaits review.
        if Payment.objects.filter(
            customer=request.user, plan=plan, status=Payment.Status.PENDING
        ).exists():
            log_security_event(
                "payment_pending_for_plan",
                level="info",
                user=request.user.email,
                plan=plan.name,
                ip=ip_address,
            )
            return Response(
                {
                    'detail': (
                        'You already have a pending payment for this plan. '
                        'Please wait for it to be reviewed before submitting another.'
                    ),
                    'plan_id': [plan.id],
                },
                status=status.HTTP_409_CONFLICT,
            )

        payment = Payment.objects.create(
            customer=request.user,
            plan=plan,
            amount=plan.price,
            transaction_id=transaction_id,
            payment_method=Payment.PaymentMethod.TELEBIRR,
            status=Payment.Status.PENDING,
        )

        log_security_event(
            "payment_submitted",
            level="info",
            user=request.user.email,
            plan=plan.name,
            payment_id=payment.id,
            ip=ip_address,
        )

        return Response({
            'id': payment.id,
            'plan_id': plan.id,
            'plan_name': plan.name,
            'transaction_id': payment.transaction_id,
            'amount': float(payment.amount),
            'status': payment.status,
            'created_at': payment.created_at,
        }, status=status.HTTP_201_CREATED)


class MobileMyPaymentView(APIView):
    """Return the authenticated user's most recent payment."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        payment = (
            Payment.objects.select_related('plan', 'license')
            .filter(customer=request.user)
            .order_by('-created_at')
            .first()
        )
        if payment is None:
            return Response({
                'id': None,
                'plan_id': None,
                'plan_name': None,
                'transaction_id': None,
                'amount': None,
                'status': 'none',
                'reason': None,
                'created_at': None,
            })
        return Response({
            'id': payment.id,
            'plan_id': payment.plan.id if payment.plan else None,
            'plan_name': payment.plan.name if payment.plan else None,
            'transaction_id': payment.transaction_id,
            'amount': float(payment.amount),
            'status': payment.status,
            'reason': payment.admin_notes or None,
            'created_at': payment.created_at,
        })

