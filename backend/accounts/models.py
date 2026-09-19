from django.contrib.auth.models import AbstractUser
from django.db import models


class LoginAttempt(models.Model):
    """Persistent record of a login attempt (success or failure).

    The failed-attempt window that powers the 5-strike, 15-minute account
    lockout is derived from this table rather than an in-process cache, so the
    lockout state survives server restarts and is consistent across all
    application workers.
    """

    class Outcome(models.TextChoices):
        FAILED = "failed", "Failed"
        SUCCESS = "success", "Success"

    identifier = models.CharField(
        max_length=254,
        help_text="The username or email the client attempted to authenticate with.",
    )
    ip_address = models.GenericIPAddressField()
    user = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="login_attempts",
    )
    success = models.BooleanField(default=False)
    outcome = models.CharField(max_length=10, choices=Outcome.choices)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["-timestamp"], name="loginattempt_ts_desc"),
            models.Index(fields=["identifier", "-timestamp"], name="loginattempt_ident_ts"),
            models.Index(fields=["ip_address", "-timestamp"], name="loginattempt_ip_ts"),
        ]

    def __str__(self):
        return f"{self.identifier} @ {self.ip_address} -> {self.outcome}"


class User(AbstractUser):
    class BusinessTypes(models.TextChoices):
        RETAILER = 'Retailer', 'Retailer'
        WHOLESALER = 'Wholesaler', 'Wholesaler'
        DISTRIBUTOR = 'Distributor', 'Distributor'
        WAREHOUSE = 'Warehouse', 'Warehouse'
        SMALL_BUSINESS = 'Small_Business', 'Small Business'

    phone = models.CharField(max_length=20, unique=True, blank=True, null=True)
    business_name = models.CharField(max_length=255, blank=True)
    business_type = models.CharField(
        max_length=50, choices=BusinessTypes.choices, blank=True
    )
    address = models.TextField(blank=True)
    is_customer = models.BooleanField(default=False)
    is_admin = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return self.email or self.username

    def is_member_of(self, business):
        """True for the business owner themselves or an active member."""
        if self.is_admin or self.is_staff or self.is_superuser:
            return True
        if self == business:
            return True
        if not business.is_customer:
            return False
        return BusinessMembership.objects.filter(
            user=self, business=business, is_active=True
        ).exists()

    def effective_businesses(self):
        """All tenant businesses this account may operate (owned + memberships)."""
        shown = {}
        if self.is_customer:
            shown[self.id] = self
        for m in BusinessMembership.objects.filter(user=self, is_active=True).select_related('business'):
            if m.business.id not in shown and getattr(m.business, 'is_customer', False):
                shown[m.business.id] = m.business
        return list(shown.values())


class BusinessMembership(models.Model):
    """A non-owner account joined to a tenant business.

    The backend models a business as the customer User created at signup
    (``is_customer=True``); every tenant FK (licenses, sync devices/records,
    payments, notifications) points at that owner User. ``BusinessMembership``
    overlays that 1-account-per-business model so several users can operate the
    same business: the ``business`` FK is the tenant owner, ``user`` the member.

    Tenant isolation stays server-derived — a client never supplies a business;
    the effective business is resolved from this table (or the owner's own id).
    """

    class Role(models.TextChoices):
        OWNER = 'owner', 'Owner'
        MANAGER = 'manager', 'Manager'
        CASHIER = 'cashier', 'Cashier'
        VIEWER = 'viewer', 'Viewer'
        INVENTORY = 'inventory', 'Inventory'
        ACCOUNTANT = 'accountant', 'Accountant'
        REPORTS = 'reports', 'Reports'
        WAREHOUSE = 'warehouse', 'Warehouse'
        CUSTOM = 'custom', 'Custom'

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='business_memberships',
        help_text='The account that belongs to the business.',
    )
    business = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='business_members',
        help_text='The tenant User (is_customer) this account operates as.',
    )
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACTIVE = 'active', 'Active'
        DISABLED = 'disabled', 'Disabled'

    # An invitation flow creates a membership as ``pending`` and it only becomes
    # ``active`` once the Owner/Manager approves the employee's paired device.
    # ``is_active`` mirrors ``status == 'active'`` for compatibility with the
    # many existing ``filter(is_active=True)`` queries (sync authorization,
    # membership resolution, management gating) — a pending/disabled member is
    # excluded exactly like a disabled one today.
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CASHIER)
    # Per-member permission overrides on top of the role's default set
    # (server mirror of the @shega/shared effective-permissions snapshot).
    permissions = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    invited_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.is_active = self.status == self.Status.ACTIVE
        super().save(*args, **kwargs)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'business'], name='uniq_membership_user_business'
            ),
            models.CheckConstraint(
                check=~models.Q(user=models.F('business')),
                name='membership_not_self',
            ),
        ]

    def __str__(self):
        return f"{self.user} -> {self.business} ({self.role})"

    def effective_permissions(self):
        """Role defaults + this member's stored overrides (server RBAC mirror)."""
        from .rbac import effective_permissions
        return effective_permissions(self.role, self.permissions or {})

    def can(self, key, can_approve=False):
        """Canonical permission check for this membership (mirrors @shega/shared)."""
        from .rbac import can
        return can(self.effective_permissions(), key, can_approve=can_approve)
