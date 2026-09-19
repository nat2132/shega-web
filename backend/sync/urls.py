from django.urls import path
from . import views
from . import pairing_views

app_name = 'sync'

urlpatterns = [
    path('push/', views.SyncPushView.as_view(), name='push'),
    path('pull/', views.SyncPullView.as_view(), name='pull'),
    path('status/', views.SyncStatusView.as_view(), name='status'),
    path('device/register/', views.SyncDeviceRegisterView.as_view(), name='device-register'),
    path('device/status/', views.SyncDeviceStatusView.as_view(), name='device-status'),
    path('devices/', views.SyncDeviceListView.as_view(), name='device-list'),
    path('device/<int:pk>/', views.SyncDeviceManageView.as_view(), name='device-manage'),
    path('pairing/invite/', pairing_views.PairingInviteView.as_view(), name='pairing-invite'),
    path('pairing/', pairing_views.PairingListView.as_view(), name='pairing-list'),
    path('pairing/lookup/', pairing_views.PairingLookupView.as_view(), name='pairing-lookup'),
    path('pairing/accept/', pairing_views.PairingAcceptView.as_view(), name='pairing-accept'),
    path('pairing/status/<int:pk>/', pairing_views.PairingStatusView.as_view(), name='pairing-status'),
    path('pairing/mine/', pairing_views.PairingMyView.as_view(), name='pairing-mine'),
    path('pairing/<int:pk>/revoke/', pairing_views.PairingRevokeView.as_view(), name='pairing-revoke'),
    path('pairing/<int:pk>/<str:decision>/', pairing_views.PairingDecisionView.as_view(), name='pairing-decision'),
    path('audit-chain/commit/', views.AuditChainCommitView.as_view(), name='audit-chain-commit'),
    path('audit-chain/verify/<int:business_id>/', views.audit_chain_verify_view, name='audit-chain-verify'),
]
