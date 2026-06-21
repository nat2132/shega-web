from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import LicensePlanViewSet, LicenseViewSet, DeviceActivationViewSet

router = DefaultRouter()
router.register(r'plans', LicensePlanViewSet, basename='license-plan')
router.register(r'licenses', LicenseViewSet, basename='license')
router.register(r'device-activations', DeviceActivationViewSet, basename='device-activation')

urlpatterns = [
    path('', include(router.urls)),
]
