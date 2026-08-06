from django.db import models
from django.conf import settings


class SystemSetting(models.Model):
    class Type(models.TextChoices):
        STRING = 'string', 'String'
        INTEGER = 'integer', 'Integer'
        FLOAT = 'float', 'Float'
        BOOLEAN = 'boolean', 'Boolean'
        JSON = 'json', 'JSON'

    key = models.CharField(max_length=255, unique=True, db_index=True)
    value = models.TextField()
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.STRING)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['key']
        verbose_name = 'System Setting'
        verbose_name_plural = 'System Settings'

    def __str__(self):
        return f"{self.key}"


class FeatureFlag(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    enabled = models.BooleanField(default=False)
    is_beta = models.BooleanField(default=False)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Feature Flag'
        verbose_name_plural = 'Feature Flags'

    def __str__(self):
        return f"{self.name} ({'ON' if self.enabled else 'OFF'})"


class AppVersion(models.Model):
    class Platform(models.TextChoices):
        ANDROID = 'android', 'Android'
        IOS = 'ios', 'iOS'
        WINDOWS = 'windows', 'Windows'
        WEB = 'web', 'Web'

    platform = models.CharField(max_length=20, choices=Platform.choices)
    version = models.CharField(max_length=20)
    min_version = models.CharField(max_length=20, blank=True, default='')
    is_force_update = models.BooleanField(default=False)
    release_notes = models.TextField(blank=True, default='')
    download_url = models.URLField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['platform', 'version']
        verbose_name = 'App Version'
        verbose_name_plural = 'App Versions'

    def __str__(self):
        return f"{self.platform} v{self.version}"


class SupportTicket(models.Model):
    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        URGENT = 'urgent', 'Urgent'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        WAITING = 'waiting', 'Waiting on Customer'
        RESOLVED = 'resolved', 'Resolved'
        CLOSED = 'closed', 'Closed'

    class Platform(models.TextChoices):
        ANDROID = 'android', 'Android'
        IOS = 'ios', 'iOS'
        WINDOWS = 'windows', 'Windows'
        WEB = 'web', 'Web'
        OTHER = 'other', 'Other'

    business = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='support_tickets',
    )
    subject = models.CharField(max_length=255)
    description = models.TextField()
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='assigned_tickets',
    )
    platform = models.CharField(max_length=20, choices=Platform.choices, default=Platform.OTHER)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Support Ticket'
        verbose_name_plural = 'Support Tickets'

    def __str__(self):
        return f"[{self.get_status_display()}] {self.subject}"


class SupportReply(models.Model):
    ticket = models.ForeignKey(
        SupportTicket,
        on_delete=models.CASCADE,
        related_name='replies',
    )
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='support_replies',
    )
    message = models.TextField()
    is_internal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Reply to {self.ticket.subject}"


class AuditLog(models.Model):
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=100, db_index=True)
    resource_type = models.CharField(max_length=100)
    resource_id = models.CharField(max_length=255, blank=True, default='')
    details = models.JSONField(default=dict, blank=True)
    before_state = models.JSONField(default=dict, blank=True)
    after_state = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'

    def __str__(self):
        return f"{self.admin} - {self.action} on {self.resource_type}"


class AdminSession(models.Model):
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='admin_sessions',
    )
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(max_length=500, blank=True, default='')
    login_time = models.DateTimeField(auto_now_add=True)
    logout_time = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-login_time']
        verbose_name = 'Admin Session'
        verbose_name_plural = 'Admin Sessions'

    def __str__(self):
        return f"{self.admin.email} - {self.login_time}"
