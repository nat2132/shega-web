from rest_framework import serializers

from payments.models import Payment, Invoice


class PaymentSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "customer",
            "customer_name",
            "license",
            "plan",
            "plan_name",
            "amount",
            "transaction_id",
            "receipt_image",
            "payment_method",
            "status",
            "admin_notes",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "transaction_id",
            "status",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]

    def get_customer_name(self, obj):
        return obj.customer.get_full_name() or obj.customer.email

    def get_plan_name(self, obj):
        return obj.plan.name if obj.plan else None


class PaymentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "license",
            "plan",
            "amount",
            "receipt_image",
            "payment_method",
        ]

    def validate(self, attrs):
        if not attrs.get("receipt_image"):
            raise serializers.ValidationError("Receipt image is required.")
        if not attrs.get("amount") or attrs["amount"] <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return attrs


class PaymentReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["approved", "rejected"])
    admin_notes = serializers.CharField(required=False, allow_blank=True)


class InvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "customer",
            "customer_name",
            "payment",
            "license",
            "amount",
            "status",
            "due_date",
            "paid_at",
            "created_at",
        ]
        read_only_fields = [
            "invoice_number",
            "paid_at",
            "created_at",
        ]

    def get_customer_name(self, obj):
        return obj.customer.get_full_name() or obj.customer.email


class InvoiceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            "customer",
            "payment",
            "license",
            "amount",
            "status",
            "due_date",
        ]
