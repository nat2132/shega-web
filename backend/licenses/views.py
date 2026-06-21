from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from .models import LicensePlan, License, DeviceActivation, LicenseAuditLog
from .serializers import (
    LicensePlanSerializer,
    LicenseSerializer,
    LicenseCreateSerializer,
    DeviceActivationSerializer,
    DeviceActivateSerializer,
    LicenseAuditLogSerializer,
    LicenseRenewSerializer,
)
from .utils import check_device_limit


class LicensePlanViewSet(viewsets.ModelViewSet):
    queryset = LicensePlan.objects.all()
    serializer_class = LicensePlanSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name']
    ordering_fields = ['price', 'duration_months', 'created_at']


class LicenseViewSet(viewsets.ModelViewSet):
    queryset = License.objects.select_related('customer', 'plan').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'plan', 'is_trial']
    search_fields = ['license_key', 'customer__email', 'customer__first_name', 'customer__last_name']
    ordering_fields = ['created_at', 'expiry_date', 'start_date']

    def get_serializer_class(self):
        if self.action == 'create':
            return LicenseCreateSerializer
        return LicenseSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        return qs.filter(customer=user)

    def perform_create(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        instance.status = 'revoked'
        instance.save()
        LicenseAuditLog.objects.create(
            license=instance,
            action='revoked',
            details={'reason': 'Soft deleted by admin', 'deleted_by': self.request.user.email},
            created_by=self.request.user,
        )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def renew(self, request, pk=None):
        license = self.get_object()
        serializer = LicenseRenewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        plan = serializer.validated_data.get('plan', license.plan)
        duration_months = serializer.validated_data.get('duration_months', plan.duration_months)
        start_date = serializer.validated_data.get('start_date', timezone.now().date())
        expiry_date = start_date + timezone.timedelta(days=30 * duration_months)

        old_plan = license.plan.name
        license.plan = plan
        license.start_date = start_date
        license.expiry_date = expiry_date
        license.status = 'active'
        license.save()

        LicenseAuditLog.objects.create(
            license=license,
            action='renewed',
            details={
                'previous_plan': old_plan,
                'new_plan': plan.name,
                'duration_months': duration_months,
                'new_start': str(start_date),
                'new_expiry': str(expiry_date),
                'renewed_by': request.user.email,
            },
            created_by=request.user,
        )

        return Response(LicenseSerializer(license).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def suspend(self, request, pk=None):
        license = self.get_object()
        if license.status != 'active':
            return Response(
                {'detail': 'Only active licenses can be suspended.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        license.status = 'suspended'
        license.save()
        LicenseAuditLog.objects.create(
            license=license,
            action='suspended',
            details={'suspended_by': request.user.email, 'reason': request.data.get('reason', '')},
            created_by=request.user,
        )
        return Response(LicenseSerializer(license).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def revoke(self, request, pk=None):
        license = self.get_object()
        prev_status = license.status
        license.status = 'revoked'
        license.save()
        LicenseAuditLog.objects.create(
            license=license,
            action='revoked',
            details={
                'previous_status': prev_status,
                'revoked_by': request.user.email,
                'reason': request.data.get('reason', ''),
            },
            created_by=request.user,
        )
        return Response(LicenseSerializer(license).data)

    @action(detail=False, methods=['get'])
    def my_licenses(self, request):
        queryset = self.get_queryset().filter(customer=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = LicenseSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = LicenseSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def activate_device(self, request, pk=None):
        license = self.get_object()

        if license.status != 'active':
            return Response(
                {'detail': 'License is not active.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not check_device_limit(license):
            return Response(
                {'detail': 'Device limit reached for this license.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = DeviceActivateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        device, created = DeviceActivation.objects.update_or_create(
            license=license,
            device_id=serializer.validated_data['device_id'],
            defaults={
                'device_name': serializer.validated_data['device_name'],
                'ip_address': serializer.validated_data.get('ip_address', request.META.get('REMOTE_ADDR', '0.0.0.0')),
                'operating_system': serializer.validated_data['operating_system'],
                'last_seen': timezone.now(),
                'is_active': True,
            },
        )

        LicenseAuditLog.objects.create(
            license=license,
            action='activated',
            details={
                'device_id': device.device_id,
                'device_name': device.device_name,
                'is_new_activation': created,
            },
            ip_address=device.ip_address,
        )

        return Response(DeviceActivationSerializer(device).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def deactivate_device(self, request, pk=None):
        license = self.get_object()
        device_id = request.data.get('device_id')

        if not device_id:
            return Response(
                {'detail': 'device_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            device = license.device_activations.get(device_id=device_id, is_active=True)
        except DeviceActivation.DoesNotExist:
            return Response(
                {'detail': 'Active device activation not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        device.is_active = False
        device.save()

        LicenseAuditLog.objects.create(
            license=license,
            action='deactivated',
            details={
                'device_id': device.device_id,
                'device_name': device.device_name,
            },
            ip_address=request.META.get('REMOTE_ADDR'),
        )

        return Response(DeviceActivationSerializer(device).data)


class DeviceActivationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DeviceActivation.objects.select_related('license').all()
    serializer_class = DeviceActivationSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['license', 'is_active', 'operating_system']
    search_fields = ['device_id', 'device_name', 'license__license_key']
    ordering_fields = ['activation_date', 'last_seen']
