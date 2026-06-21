from datetime import timedelta
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from licenses.models import License, DeviceActivation, LicenseAuditLog

from .permissions import PublicEndpoint
from .serializers import (
    VerifyLicenseSerializer,
    ActivateDeviceSerializer,
    DeactivateDeviceSerializer,
    RenewLicenseSerializer,
    LicenseStatusSerializer,
)
from .throttles import LicenseVerifyThrottle


class VerifyLicenseView(APIView):
    permission_classes = [PublicEndpoint]
    throttle_classes = [LicenseVerifyThrottle]

    def post(self, request):
        serializer = VerifyLicenseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            license = License.objects.get(
                license_key=serializer.validated_data['license_key'],
            )
        except License.DoesNotExist:
            return Response(
                {'valid': False, 'message': 'Invalid license key.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if license.status != 'active':
            return Response(
                {'valid': False, 'message': f'License is {license.status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if license.expiry_date < timezone.now().date():
            return Response(
                {'valid': False, 'message': 'License has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        device_id = serializer.validated_data['device_id']
        device = license.device_activations.filter(device_id=device_id).first()

        if device and device.is_active:
            device.last_seen = timezone.now()
            device.save(update_fields=['last_seen'])
        elif device and not device.is_active:
            return Response(
                {'valid': False, 'message': 'Device is deactivated.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        active_count = license.device_activations.filter(is_active=True).count()
        if not device and active_count >= license.device_limit:
            return Response(
                {'valid': False, 'message': 'Device limit reached.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            'valid': True,
            'license_key': license.license_key,
            'status': license.status,
            'expiry_date': license.expiry_date,
            'message': 'License is valid.',
        })


class ActivateDeviceView(APIView):
    permission_classes = [PublicEndpoint]
    throttle_classes = [LicenseVerifyThrottle]

    def post(self, request):
        serializer = ActivateDeviceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            license = License.objects.get(
                license_key=serializer.validated_data['license_key'],
            )
        except License.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Invalid license key.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if license.status != 'active':
            return Response(
                {'success': False, 'message': f'License is {license.status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if license.expiry_date < timezone.now().date():
            return Response(
                {'success': False, 'message': 'License has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        device_id = serializer.validated_data['device_id']
        device, created = DeviceActivation.objects.get_or_create(
            license=license,
            device_id=device_id,
            defaults={
                'device_name': serializer.validated_data.get('device_name', ''),
                'operating_system': serializer.validated_data.get('operating_system', ''),
                'ip_address': request.META.get('REMOTE_ADDR', '0.0.0.0'),
            },
        )

        if not created:
            if device.is_active:
                device.last_seen = timezone.now()
                device.device_name = serializer.validated_data.get('device_name', device.device_name)
                device.operating_system = serializer.validated_data.get(
                    'operating_system', device.operating_system,
                )
                device.save(update_fields=['last_seen', 'device_name', 'operating_system'])
                return Response({
                    'success': True,
                    'message': 'Device already active.',
                    'device_id': device.device_id,
                    'activated_at': device.activation_date,
                })

            active_count = license.device_activations.filter(is_active=True).count()
            if active_count >= license.device_limit:
                return Response(
                    {'success': False, 'message': 'Device limit reached.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            device.is_active = True
            device.device_name = serializer.validated_data.get('device_name', device.device_name)
            device.operating_system = serializer.validated_data.get(
                'operating_system', device.operating_system,
            )
            device.save(update_fields=['is_active', 'device_name', 'operating_system', 'last_seen'])
        else:
            active_count = license.device_activations.filter(is_active=True).count()
            if active_count > license.device_limit:
                device.is_active = False
                device.save(update_fields=['is_active'])
                return Response(
                    {'success': False, 'message': 'Device limit reached.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response({
            'success': True,
            'message': 'Device activated successfully.',
            'device_id': device.device_id,
            'activated_at': device.activation_date,
        })


class DeactivateDeviceView(APIView):
    permission_classes = [PublicEndpoint]
    throttle_classes = [LicenseVerifyThrottle]

    def post(self, request):
        serializer = DeactivateDeviceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            license = License.objects.get(
                license_key=serializer.validated_data['license_key'],
            )
        except License.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Invalid license key.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        device = license.device_activations.filter(
            device_id=serializer.validated_data['device_id'],
        ).first()

        if not device:
            return Response(
                {'success': False, 'message': 'Device not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not device.is_active:
            return Response(
                {'success': True, 'message': 'Device was already deactivated.'},
            )

        device.is_active = False
        device.last_seen = timezone.now()
        device.save(update_fields=['is_active', 'last_seen'])

        return Response({
            'success': True,
            'message': 'Device deactivated successfully.',
        })


class RenewLicenseView(APIView):
    permission_classes = [PublicEndpoint]
    throttle_classes = [LicenseVerifyThrottle]

    def post(self, request):
        serializer = RenewLicenseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            license = License.objects.get(
                license_key=serializer.validated_data['license_key'],
            )
        except License.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Invalid license key.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if license.status == 'revoked':
            return Response(
                {'success': False, 'message': 'Cannot renew a revoked license.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_expiry = timezone.now().date() + timedelta(days=365)
        license.expiry_date = new_expiry
        license.status = 'active'
        license.save(update_fields=['expiry_date', 'status'])

        return Response({
            'success': True,
            'message': 'License renewed successfully.',
            'new_expiry_date': new_expiry,
            'payment_reference': serializer.validated_data['payment_reference'],
        })


class LicenseStatusView(APIView):
    permission_classes = [PublicEndpoint]
    throttle_classes = [LicenseVerifyThrottle]

    def get(self, request):
        serializer = LicenseStatusSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        try:
            license = License.objects.get(
                license_key=serializer.validated_data['license_key'],
            )
        except License.DoesNotExist:
            return Response(
                {'valid': False, 'message': 'Invalid license key.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        active_devices = license.device_activations.filter(is_active=True)
        devices = [{
            'device_id': d.device_id,
            'device_name': d.device_name,
            'operating_system': d.operating_system,
            'last_seen': d.last_seen,
            'activated_at': d.activation_date,
        } for d in active_devices]

        return Response({
            'valid': license.status == 'active' and license.expiry_date > timezone.now().date(),
            'license_key': license.license_key,
            'status': license.status,
            'expiry_date': license.expiry_date,
            'device_limit': license.device_limit,
            'active_devices_count': active_devices.count(),
            'active_devices': devices,
            'created_at': license.created_at,
        })
