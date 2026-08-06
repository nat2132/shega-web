from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q

from .models import CustomerProfile
from .serializers import CustomerProfileSerializer, CustomerListSerializer


class CustomerProfileViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    search_fields = ['company_name', 'user__email', 'user__phone', 'user__username']

    def get_serializer_class(self):
        if self.action == 'list':
            return CustomerListSerializer
        return CustomerProfileSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return CustomerProfile.objects.select_related('user').all()
        return CustomerProfile.objects.select_related('user').filter(user=user)

    def perform_create(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        instance.status = CustomerProfile.Status.BLOCKED
        instance.save(update_fields=['status'])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {'detail': 'Customer has been blocked.'},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'])
    def search(self, request):
        q = request.query_params.get('q', '')
        if not q:
            return Response({'results': []})

        queryset = self.get_queryset().filter(
            Q(company_name__icontains=q) |
            Q(user__email__icontains=q) |
            Q(user__username__icontains=q) |
            Q(user__phone__icontains=q)
        )
        serializer = CustomerListSerializer(queryset, many=True)
        return Response({'results': serializer.data})
