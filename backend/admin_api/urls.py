from django.urls import path, include
from rest_framework.routers import DefaultRouter

from admin_api import views

router = DefaultRouter()
router.register(r'businesses', views.BusinessViewSet, basename='admin-business')
router.register(r'subscriptions', views.SubscriptionViewSet, basename='admin-subscription')
router.register(r'payments', views.PaymentViewSet, basename='admin-payment')
router.register(r'trials', views.TrialViewSet, basename='admin-trial')
router.register(r'admins', views.AdminUserViewSet, basename='admin-user')
router.register(r'notifications', views.AdminNotificationViewSet, basename='admin-notification')
router.register(r'support-tickets', views.SupportTicketViewSet, basename='admin-support-ticket')
router.register(r'feature-flags', views.FeatureFlagViewSet, basename='admin-feature-flag')
router.register(r'app-versions', views.AppVersionViewSet, basename='admin-app-version')
router.register(r'audit-logs', views.AuditLogViewSet, basename='admin-audit-log')

urlpatterns = [
    path('', include(router.urls)),

    # Dashboard
    path('dashboard/', views.dashboard_view, name='admin-dashboard'),

    # Revenue
    path('revenue/', views.revenue_overview, name='admin-revenue'),
    path('revenue/by-platform/', views.revenue_by_platform, name='admin-revenue-by-platform'),
    path('revenue/by-plan/', views.revenue_by_plan, name='admin-revenue-by-plan'),
    path('revenue/by-method/', views.revenue_by_method, name='admin-revenue-by-method'),
    path('revenue/renewals/', views.revenue_renewals, name='admin-revenue-renewals'),

    # Analytics
    path('analytics/overview/', views.analytics_overview, name='admin-analytics-overview'),
    path('analytics/active-businesses/', views.analytics_active_businesses, name='admin-analytics-active'),
    path('analytics/features/', views.analytics_features, name='admin-analytics-features'),
    path('analytics/retention/', views.analytics_retention, name='admin-analytics-retention'),
    path('analytics/mrr/', views.analytics_mrr, name='admin-analytics-mrr'),

    # Settings
    path('settings/', views.system_settings, name='admin-settings'),

    # Reports
    path('reports/revenue/', views.report_revenue, name='admin-report-revenue'),
    path('reports/businesses/', views.report_businesses, name='admin-report-businesses'),
    path('reports/subscriptions/', views.report_subscriptions, name='admin-report-subscriptions'),
    path('reports/payments/', views.report_payments, name='admin-report-payments'),
    path('reports/trials/', views.report_trials, name='admin-report-trials'),
    path('reports/renewals/', views.report_renewals, name='admin-report-renewals'),

    # Global Search
    path('search/', views.global_search, name='admin-global-search'),
]
