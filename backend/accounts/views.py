from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from django.utils.http import urlsafe_base64_decode
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes, force_str

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import User, LoginAttempt
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    ChangePasswordSerializer,
    ProfileUpdateSerializer,
)
from .permissions import IsAdminUser, IsOwnerOrAdmin
from .throttles import (
    LoginThrottle,
    RegisterThrottle,
    RegisterEmailThrottle,
    PasswordResetThrottle,
    PasswordResetConfirmThrottle,
    failed_login_count,
)
from accounts.security_log import log_security_event

UserModel = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserCreateSerializer
    # 5/h per IP + 3/day per (IP + normalised email).
    throttle_classes = [RegisterThrottle, RegisterEmailThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = serializer.save()
        except (IntegrityError, DjangoValidationError):
            # Resource warn: a concurrent request (or a duplicate username/email
            # that slipped past validation) must surface as a 400, never a 500.
            log_security_event(
                "registration_duplicate_conflict",
                email=serializer.validated_data.get("email"),
                ip=request.META.get("REMOTE_ADDR", ""),
            )
            return Response(
                {'detail': 'An account with these details already exists.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        log_security_event("registration_succeeded", email=user.email, ip=request.META.get("REMOTE_ADDR", ""))
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [LoginThrottle]

    # Lockout policy.
    LOCKOUT_THRESHOLD = getattr(settings, "LOGIN_LOCKOUT_THRESHOLD", 5)
    LOCKOUT_WINDOW = getattr(settings, "LOGIN_LOCKOUT_WINDOW_MINUTES", 15)

    def _record_attempt(self, request, identifier, user, success):
        LoginAttempt.objects.create(
            identifier=identifier,
            ip_address=request.META.get("REMOTE_ADDR", "0.0.0.0"),
            user=user if success else None,
            outcome=LoginAttempt.Outcome.SUCCESS if success else LoginAttempt.Outcome.FAILED,
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
        )

    def post(self, request):
        username = request.data.get('username', '') or request.data.get('email', '')
        password = request.data.get('password', '')
        ip_address = request.META.get("REMOTE_ADDR", "0.0.0.0")
        user_agent = request.META.get("HTTP_USER_AGENT", "")[:255]

        if '@' in username:
            users = UserModel.objects.filter(email__iexact=username)
            if users.exists():
                username = users.first().username

        identifier = username or ip_address or "unknown"

        # Enforce the persisted lockout. The threshold is the number of failed
        # attempts within the window that triggers a 15-minute block.
        recent_failures = failed_login_count(identifier, window_minutes=self.LOCKOUT_WINDOW)
        if recent_failures >= self.LOCKOUT_THRESHOLD:
            log_security_event(
                "login_locked_out",
                level="warning",
                identifier=identifier,
                ip=ip_address,
                failures=recent_failures,
            )
            return Response(
                {
                    'detail': (
                        'Too many failed login attempts. '
                        f'Please try again in {self.LOCKOUT_WINDOW} minutes.'
                    ),
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        user = authenticate(username=username, password=password)
        if user is None:
            self._record_attempt(request, identifier, None, success=False)
            log_security_event(
                "login_failed",
                level="info",
                identifier=identifier,
                ip=ip_address,
                user_agent=user_agent,
            )
            return Response(
                {'detail': 'No active account found with the given credentials'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        self._record_attempt(request, identifier, user, success=True)
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })


class LogoutView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {'error': 'Refresh token is required.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ProfileView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        user_serializer = UserSerializer(request.user)
        return Response(user_serializer.data)


class ChangePasswordView(generics.UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self.get_object()
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response(
            {'detail': 'Password updated successfully.'},
            status=status.HTTP_200_OK,
        )


class CustomerListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated, IsAdminUser)
    queryset = User.objects.filter(is_customer=True)
    filter_backends = (SearchFilter, OrderingFilter)
    search_fields = ('email', 'phone', 'business_name', 'username')
    ordering_fields = ('created_at', 'business_name', 'email')
    ordering = ('-created_at',)


class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated, IsOwnerOrAdmin)
    queryset = User.objects.filter(is_customer=True)


# ---------------------------------------------------------------------------
# Password reset (throttled, stateless single-use tokens)
# ---------------------------------------------------------------------------


class PasswordResetView(APIView):
    """Issue a password-reset token for a registered email.

    Always returns 200/201 with a generic message regardless of whether the
    email exists, to avoid user-enumeration. The token is handed back in the
    response in this mobile-first setup (no mail transport configured); the
    client stores it securely and only it can redeem it.
    """

    permission_classes = (permissions.AllowAny,)
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        ip_address = request.META.get("REMOTE_ADDR", "0.0.0.0")

        user = UserModel.objects.filter(email__iexact=email).first()
        token_payload = None
        if user is not None:
            token = default_token_generator.make_token(user)
            token_payload = {
                'email': user.email,
                'uid': urlsafe_base64_encode(force_bytes(user.pk)),
                'token': token,
            }
            log_security_event(
                "password_reset_requested",
                level="info",
                email=user.email,
                ip=ip_address,
            )
        return Response(
            {
                'detail': (
                    'If that email is registered, a reset link has been sent.'
                ),
                **({'reset_data': token_payload} if token_payload else {}),
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """Consume a reset token issued by ``PasswordResetView`` and set a new password."""

    permission_classes = (permissions.AllowAny,)
    throttle_classes = [PasswordResetConfirmThrottle]

    def post(self, request):
        uid = (request.data.get('uid') or '').strip()
        token = (request.data.get('token') or '').strip()
        password = request.data.get('password')
        password2 = request.data.get('password2')

        if not uid or not token:
            return Response(
                {'detail': 'Reset token and UID are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not password or not password2:
            return Response(
                {'detail': 'Both password fields are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if password != password2:
            return Response(
                {'detail': 'Passwords do not match.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = UserModel.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, UserModel.DoesNotExist):
            return Response(
                {'detail': 'The reset link is invalid.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            log_security_event(
                "password_reset_invalid_token",
                level="warning",
                email=user.email,
                ip=request.META.get("REMOTE_ADDR", ""),
            )
            return Response(
                {'detail': 'The reset link is invalid or has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(password)
        user.save()
        log_security_event(
            "password_reset_succeeded",
            level="info",
            email=user.email,
            ip=request.META.get("REMOTE_ADDR", ""),
        )
        return Response({'detail': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)
