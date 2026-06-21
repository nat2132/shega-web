from django.utils import timezone

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

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

