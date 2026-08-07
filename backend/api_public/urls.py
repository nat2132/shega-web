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
    path('verify/', VerifyLicenseView.as_view(), name='license-verify-slash'),
    path('activate', ActivateDeviceView.as_view(), name='license-activate'),
    path('activate/', ActivateDeviceView.as_view(), name='license-activate-slash'),
    path('deactivate', DeactivateDeviceView.as_view(), name='license-deactivate'),
    path('deactivate/', DeactivateDeviceView.as_view(), name='license-deactivate-slash'),
    path('renew', RenewLicenseView.as_view(), name='license-renew'),
    path('renew/', RenewLicenseView.as_view(), name='license-renew-slash'),
    path('status', LicenseStatusView.as_view(), name='license-status'),
    path('status/', LicenseStatusView.as_view(), name='license-status-slash'),
]
