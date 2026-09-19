from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('password-reset/', views.PasswordResetView.as_view(), name='password-reset'),
    path('password-reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('customers/', views.CustomerListView.as_view(), name='customer-list'),
    path('customers/<int:pk>/', views.CustomerDetailView.as_view(), name='customer-detail'),
    path('memberships/', views.MyMembershipsView.as_view(), name='my-memberships'),
    path('businesses/<int:pk>/members/', views.BusinessMembersView.as_view(), name='business-members'),
    path('businesses/<int:pk>/members/<int:mpk>/', views.BusinessMembershipDetailView.as_view(), name='business-membership-detail'),
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh'),
]
