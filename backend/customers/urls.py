from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import CustomerProfileViewSet

router = DefaultRouter()
router.register('customers', CustomerProfileViewSet, basename='customer')

urlpatterns = [
    path('', include(router.urls)),
]
