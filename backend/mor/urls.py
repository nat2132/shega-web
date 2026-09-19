from django.urls import path

from .views import MorVerifyTinView

urlpatterns = [
    path('verify-tin/', MorVerifyTinView.as_view(), name='mor-verify-tin'),
]