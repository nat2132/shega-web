from django.urls import path, include
from rest_framework.routers import DefaultRouter

from payments.views import (
    PaymentViewSet, InvoiceViewSet,
    MobilePaymentCreateView, MobileMyPaymentView,
)

router = DefaultRouter()
router.register(r"payments", PaymentViewSet, basename="payment")
router.register(r"invoices", InvoiceViewSet, basename="invoice")

urlpatterns = [
    path("create/", MobilePaymentCreateView.as_view(), name="payment-create-mobile"),
    path("my-payment/", MobileMyPaymentView.as_view(), name="payment-my-mobile"),
    path("", include(router.urls)),
]
