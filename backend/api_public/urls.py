from django.urls import path

from .views import (
    VerifyLicenseView,
    ActivateDeviceView,
    DeactivateDeviceView,
    RenewLicenseView,
    LicenseStatusView,
)

urlpatterns = [
    path('verify', VerifyLicenseView.as_view(), name='license-verify'),
    path('activate', ActivateDeviceView.as_view(), name='license-activate'),
    path('deactivate', DeactivateDeviceView.as_view(), name='license-deactivate'),
    path('renew', RenewLicenseView.as_view(), name='license-renew'),
    path('status', LicenseStatusView.as_view(), name='license-status'),
]
