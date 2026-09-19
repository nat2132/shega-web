from django.db import models
from django.conf import settings
from django.utils import timezone


class PairingInvitation(models.Model):
    """A short-lived, single-use, business-scoped invitation to join a business.

    Issued by the Owner/Manager to onboard an employee. The QR/paired secret is
    the ``token`` returned once at issue time (never stored — only its PBKDF2
    hash is kept), so the invitation cannot be replayed or recovered from the
    database. The authoritative role/permission assignment is fixed at issue
    time by the inviter and stored here; the employee's device never supplies
    role/permission data.

    Lifecycle: ``pending`` → ``used`` (employee accepted; a pending SyncDevice +
    pending BusinessMembership are created) → the Owner/Manager approves or
    rejects reaching a terminal ``approved`` / ``rejected`` state. ``revoked``
    (also surfaced as CANCELLED) cancels the invitation before use. Expiration
    is enforced by ``expires_at`` and lazily marks the invite ``expired``.

    The QR/paired secret is the one-time ``token`` (returned once, only a PBKDF2
    hash stored). A 6-digit ``code`` is also issued for manual entry — short and
    low-entropy by design, so it is always temporary and single-use; it is never
    a permanent credential.

    Invitations are platform-agnostic: the joining device's platform is recorded
    only for the roster; roles and permissions belong to the user's business
    membership, never to the device type.
    """

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('used', 'Used'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('revoked', 'Revoked'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
    ]

    business = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pairing_invitations',
    )
    inviter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='issued_pairing_invitations',
    )
    token_hash = models.CharField(max_length=128, db_index=True)  # PBKDF2 of the one-time token
    code = models.CharField(max_length=16, default='', blank=True, db_index=True)  # 6-digit manual-entry code
    employee_name = models.CharField(max_length=255, default='', blank=True)
    role = models.CharField(max_length=50, default='cashier')
    permissions = models.JSONField(default=dict, blank=True)
    register = models.CharField(max_length=120, default='', blank=True)
    location = models.CharField(max_length=120, default='', blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True
    )
    expires_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    used_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='accepted_pairing_invitations',
    )
    # The sync device created at accept time (target of approve/reject).
    device = models.ForeignKey(
        'SyncDevice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pairing_invitations',
    )

    class Meta:
        verbose_name = 'Pairing Invitation'
        verbose_name_plural = 'Pairing Invitations'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.employee_name or "invite"} -> {self.business_id} ({self.status})'

    @property
    def expired(self):
        return self.expires_at is not None and self.expires_at <= timezone.now()

    def consume(self, user):
        """Atomically mark the invitation used (single-use enforcement).

        Returns True if this call won the single-use slot (i.e. the token was
        still ``pending``), False if it was already used/revoked/expired.
        """
        from django.db import transaction

        with transaction.atomic():
            locked = PairingInvitation.objects.select_for_update().get(pk=self.pk)
            if locked.status != 'pending' or locked.expired:
                return False
            locked.status = 'used'
            locked.used_at = timezone.now()
            locked.used_by = user
            locked.save(update_fields=['status', 'used_at', 'used_by'])
            self.status = locked.status
        return True


class SyncDevice(models.Model):
    """A device authorized to synchronize one business (tenant).

    The tenant is always the owning customer User (an ``accounts.User`` with
    ``is_customer=True``); it is never derived from a client-supplied
    ``business_id``. A device belongs to exactly one business and one License.

    Sync status is separate from license activation: ``status`` may be
    ``'pending' | 'active' | 'locked' | 'disabled' | 'removed'`` and mirrors the
    roster device status used by §17/§18 remote device control. A disabled or
    removed device is refused cloud sync even if it still holds a valid token.

    The ``platform`` field records whether the device is mobile or desktop.
    This is informational only — roles and permissions belong to the user's
    business membership, NOT the device type. Any device type can have any role.

    ``user`` binds this physical device to the person (accounts.User) who owns
    it. One user may own many devices (desktop + mobile + others); each
    authorized install is a separate row all pointing at the same user and the
    user's BusinessMembership. This is the canonical device->user binding.
    """

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('locked', 'Locked'),
        ('disabled', 'Disabled'),
        ('removed', 'Removed'),
    ]
    BLOCKING_STATUSES = ('locked', 'disabled', 'removed')

    business = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sync_devices',
        help_text='The tenant business (owner User with is_customer=True).',
    )
    license = models.ForeignKey(
        'licenses.License',
        on_delete=models.CASCADE,
        related_name='sync_devices',
    )
    device_id = models.CharField(max_length=255)  # from client sync_meta.device_id
    device_name = models.CharField(max_length=255, default='', blank=True)
    platform = models.CharField(
        max_length=10, choices=[('mobile', 'Mobile'), ('desktop', 'Desktop')],
        default='mobile', blank=True,
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', db_index=True)
    # The person (accounts.User) this physical device belongs to. A single user
    # owns many devices (desktop + mobile + others); each authorized install is a
    # separate SyncDevice row all pointing back to the SAME user/membership.
    # This is the canonical device->user binding: device revocation is per-device,
    # while identity/role/permissions live on the user's BusinessMembership.
    # Nullable pre-binding (paired-but-unapproved, or an unlinked legacy row).
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_devices',
        db_index=True,
        help_text='The person (account) this device belongs to.',
    )
    # Role snapshot for server-side permission checks (cloud transport keeps the
    # roster as business data; this is a shallow, per-device mirror used to gate
    # the *transport* itself, not an authoritative permission store). It is a
    # cache of the user's BusinessMembership role at auth time and is refreshed
    # whenever that membership changes — it is never the source of truth.
    role_key = models.CharField(max_length=50, default='owner', blank=True)
    secret_hash = models.CharField(max_length=128, default='', blank=True)  # provisioned device key
    is_active = models.BooleanField(default=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Sync Device'
        verbose_name_plural = 'Sync Devices'
        unique_together = ['business', 'device_id']

    def __str__(self):
        return f'{self.device_name or self.device_id} ({self.business_id})'

    @property
    def blocked(self):
        return self.status in self.BLOCKING_STATUSES


class SyncRecord(models.Model):
    """One cloud-deliverable change for a business (outbox/inbox in the cloud).

    Idempotency: a retry of the same outbox entry is keyed by
    ``(business, device, client_seq)``. ``unique_together`` makes repeated
    pushes of the same (device, seq) a no-op, so a reconnection / retry after
    partial upload cannot duplicate a sale, stock movement, customer, etc.

    Ordering: ``id`` is a global monotonic primary key; per-business pull cursor
    is ``WHERE business=... AND id > cursor``.
    """

    business = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sync_records',
    )
    device = models.ForeignKey(
        SyncDevice,
        on_delete=models.CASCADE,
        related_name='sync_records',
    )
    client_seq = models.BigIntegerField(default=0)
    entity = models.CharField(max_length=80)
    entity_uuid = models.CharField(max_length=64, db_index=True)
    op = models.CharField(max_length=10)
    payload = models.JSONField(default=dict)
    checksum = models.CharField(max_length=128, default='', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def origin_device_id(self):
        return self.device.device_id

    class Meta:
        verbose_name = 'Sync Record'
        verbose_name_plural = 'Sync Records'
        ordering = ['id']
        constraints = [
            models.UniqueConstraint(
                fields=['business', 'device', 'client_seq'],
                name='uniq_sync_business_device_seq',
            ),
        ]
        indexes = [
            models.Index(fields=['business', 'id']),
        ]

    def __str__(self):
        return f'{self.business_id}:{self.device.device_id}:{self.client_seq} {self.op} {self.entity}.{self.entity_uuid}'


class AuditChainCommit(models.Model):
    """Tamper-evidence anchor for one business's audit hash chain (§32).

    The clients (mobile phone + desktop hub) compute a SHA-256 hash chain over
    their audit events and the desktop hub — the authoritative LAN master —
    re-chains them deterministically and verifies the result locally with
    ``verifyAuditChain()``. This model stores that verified chain state so the
    backend acts as a root of trust: it records how many audit records the hub
    believes exist and the per-record chain (``prev_hash``/``hash`` pairs).

    The backend recomputes the chain from the stored per-record hashes and
    checks continuity (each ``prev_hash`` matches the previous record's
    ``hash``, starting at ``GENESIS``), the total count, and that ``head_hash``
    matches the final record. Any deviation — an edited record, a reordered or
    missing record, or a forged head hash — breaks the chain and is reported by
    the admin verify endpoint.

    One row per business (its latest committed chain state). A newer commit
    replaces the previous, so only the current root of trust is retained.
    ``records`` is the ordered list of ``{seq, prev_hash, hash}``.
    """

    business = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='audit_chain_commit',
        primary_key=True,
    )
    device = models.ForeignKey(
        SyncDevice,
        on_delete=models.CASCADE,
        related_name='audit_chain_commits',
    )
    record_count = models.PositiveIntegerField(default=0)
    head_hash = models.CharField(max_length=64)
    records = models.JSONField(default=list)
    committed_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Audit Chain Commit'
        verbose_name_plural = 'Audit Chain Commits'

    def __str__(self):
        return f'{self.business_id}:{self.record_count} records head={self.head_hash[:12]}...'

