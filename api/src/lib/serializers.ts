import type {
  User,
  Plan,
  License,
  DeviceActivation,
  Payment,
  Invoice,
  AuditLog,
  AdminSession,
  AppVersion,
  SystemSetting,
  Notification,
  LicenseAuditLog,
} from "@prisma/client";

/**
 * DRF-compatible serializers. Field names/values mirror rest_framework output
 * so the existing Next.js admin panel keeps working unchanged.
 */

export type UserLike = Pick<
  User,
  | "id"
  | "username"
  | "email"
  | "first_name"
  | "last_name"
  | "phone"
  | "business_name"
  | "business_type"
  | "address"
  | "is_staff"
  | "is_active"
  | "is_superuser"
  | "is_admin"
  | "is_customer"
  | "email_verified"
  | "phone_verified"
  | "date_joined"
  | "last_login"
  | "created_at"
  | "updated_at"
  | "notes"
>;

export function fullName(user: { first_name?: string | null; last_name?: string | null; email?: string | null; username?: string | null } | null | undefined): string {
  if (!user) return "";
  const first = user.first_name || "";
  const last = user.last_name || "";
  const name = [first, last].filter(Boolean).join(" ").trim();
  return name || user.email || user.username || "";
}

/** Matches Django UserSerializer (all fields except password/groups/user_permissions). */
export function serializeUser(user: UserLike): Record<string, unknown> {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    full_name: fullName(user),
    phone: user.phone,
    business_name: user.business_name,
    business_type: user.business_type,
    address: user.address,
    is_staff: user.is_staff,
    is_active: user.is_active,
    is_superuser: user.is_superuser,
    is_admin: user.is_admin,
    is_customer: user.is_customer,
    email_verified: user.email_verified,
    phone_verified: user.phone_verified,
    date_joined: isoDateTime(user.date_joined),
    last_login: isoDateTime(user.last_login),
    created_at: isoDateTime(user.created_at),
    updated_at: isoDateTime(user.updated_at),
    notes: user.notes,
  };
}

export function serializePlan(plan: Plan): Record<string, unknown> {
  return {
    id: plan.id,
    name: plan.name,
    display_name: plan.name,
    edition: plan.edition,
    duration_months: plan.duration_months,
    device_limit: plan.device_limit,
    price: toNumber(plan.price),
    included_mobile_devices: plan.included_mobile_devices,
    included_desktop_devices: plan.included_desktop_devices,
    included_businesses: plan.included_businesses,
    addon_mobile_price: toNumber(plan.addon_mobile_price),
    addon_desktop_price: toNumber(plan.addon_desktop_price),
    addon_business_price: toNumber(plan.addon_business_price),
    is_active: plan.is_active,
    created_at: isoDateTime(plan.created_at),
  };
}

export function planLabel(plan: Pick<Plan, "name" | "duration_months"> | null | undefined): string | null {
  if (!plan) return null;
  const plural = plan.duration_months === 1 ? " month" : " months";
  return `${plan.name} (${plan.duration_months}${plural})`;
}

/** Matches licenses.serializers.LicenseSerializer. */
export function serializeLicense(
  license: License & { customer?: UserLike; plan?: Plan | null },
): Record<string, unknown> {
  return {
    id: license.id,
    license_key: license.license_key,
    customer: license.customer_id,
    customer_name: license.customer ? fullName(license.customer) : null,
    plan: license.plan_id,
    plan_name: license.plan?.name ?? null,
    plan_details: license.plan ? serializePlan(license.plan) : null,
    status: license.status,
    start_date: isoDate(license.start_date),
    expiry_date: isoDate(license.expiry_date),
    device_limit: license.device_limit,
    max_mobile_devices: license.max_mobile_devices,
    max_desktop_devices: license.max_desktop_devices,
    max_businesses: license.max_businesses,
    notes: license.notes,
    is_trial: license.is_trial,
    created_at: isoDateTime(license.created_at),
    updated_at: isoDateTime(license.updated_at),
  };
}

export function serializeDeviceActivation(
  da: DeviceActivation & { license?: License | null },
): Record<string, unknown> {
  return {
    id: da.id,
    license: da.license_id,
    license_key: da.license?.license_key ?? null,
    device_id: da.device_id,
    device_name: da.device_name,
    activation_date: isoDateTime(da.activation_date),
    last_seen: isoDateTime(da.last_seen),
    ip_address: da.ip_address,
    operating_system: da.operating_system,
    device_type: da.device_type,
    is_active: da.is_active,
  };
}

export function serializeLicenseAuditLog(
  log: LicenseAuditLog & {
    created_by?: UserLike | null;
    license?: License | null;
  },
): Record<string, unknown> {
  return {
    id: log.id,
    license: log.license_id,
    license_key: log.license?.license_key ?? null,
    action: log.action,
    details: parseJsonObject(log.details),
    ip_address: log.ip_address,
    created_by: log.created_by_id,
    created_by_name: log.created_by ? fullName(log.created_by) : null,
    created_at: isoDateTime(log.created_at),
  };
}

/** Matches admin_api.serializers.SubscriptionListSerializer. */
export function serializeSubscriptionList(
  sub: License & { customer?: UserLike | null; plan?: Plan | null; device_activations?: (DeviceActivation | null)[] | null },
): Record<string, unknown> {
  const active = (sub.device_activations ?? []).filter((d) => d && d.is_active);
  return {
    id: sub.id,
    license_key: sub.license_key,
    customer: sub.customer_id,
    customer_name: sub.customer ? fullName(sub.customer) : null,
    customer_email: sub.customer?.email ?? null,
    plan: sub.plan_id,
    plan_name: sub.plan?.name ?? null,
    plan_label: planLabel(sub.plan),
    plan_price: sub.plan ? toNumber(sub.plan.price) : null,
    platform: active[0]?.operating_system ?? null,
    status: sub.status,
    start_date: isoDate(sub.start_date),
    expiry_date: isoDate(sub.expiry_date),
    device_limit: sub.device_limit,
    max_mobile_devices: sub.max_mobile_devices,
    max_desktop_devices: sub.max_desktop_devices,
    max_businesses: sub.max_businesses,
    is_trial: sub.is_trial,
    days_remaining: daysRemaining(sub.expiry_date),
    notes: sub.notes,
    created_at: isoDateTime(sub.created_at),
    updated_at: isoDateTime(sub.updated_at),
  };
}

/** Matches admin_api.serializers.SubscriptionDetailSerializer. */
export function serializeSubscriptionDetail(
  sub: License & {
    customer?: UserLike | null;
    plan?: Plan | null;
    payments?: Payment[] | null;
    audit_logs?: LicenseAuditLog[] | null;
    device_activations?: DeviceActivation[] | null;
  },
): Record<string, unknown> {
  return {
    ...serializeSubscriptionList(sub),
    customer_phone: sub.customer?.phone ?? null,
    plan_details: sub.plan ? serializePlan(sub.plan) : null,
    payments: (sub.payments ?? []).map((p) => serializePaymentList(p)),
    audit_logs: (sub.audit_logs ?? []).map((l) => serializeLicenseAuditLog(l)),
    device_count: (sub.device_activations ?? []).filter((d) => d.is_active).length,
  };
}

/** Matches admin_api.serializers.PaymentListSerializer. */
export function serializePaymentList(
  pmt: Payment & { customer?: UserLike | null; plan?: Plan | null; license?: License | null },
): Record<string, unknown> {
  return {
    id: pmt.id,
    customer: pmt.customer_id,
    customer_name: pmt.customer ? fullName(pmt.customer) : null,
    customer_email: pmt.customer?.email ?? null,
    business_name: (pmt.customer?.business_name || "").trim() || null,
    license: pmt.license_id,
    plan: pmt.plan_id,
    plan_name: pmt.plan?.name ?? null,
    plan_label: planLabel(pmt.plan),
    payment_type: pmt.payment_type,
    quantity: pmt.quantity,
    description: pmt.description,
    amount: toNumber(pmt.amount),
    transaction_id: pmt.transaction_id,
    receipt_image: pmt.receipt_image ?? null,
    payment_method: pmt.payment_method,
    status: pmt.status,
    admin_notes: pmt.admin_notes,
    reviewed_by: pmt.reviewed_by_id,
    reviewed_at: isoDateTime(pmt.reviewed_at),
    created_at: isoDateTime(pmt.created_at),
    updated_at: isoDateTime(pmt.updated_at),
  };
}

/** Matches admin_api.serializers.PaymentDetailSerializer. */
export function serializePaymentDetail(
  pmt: Payment & {
    customer?: UserLike | null;
    plan?: Plan | null;
    license?: License | null;
    invoice?: Invoice | null;
  },
): Record<string, unknown> {
  return {
    ...serializePaymentList(pmt),
    customer_phone: pmt.customer?.phone ?? null,
    plan_details: pmt.plan ? serializePlan(pmt.plan) : null,
    license_details: pmt.license ? serializeLicense(pmt.license) : null,
    invoice: pmt.invoice ? serializeInvoice(pmt.invoice) : null,
  };
}

export function serializeInvoice(inv: Invoice & { customer?: UserLike | null }): Record<string, unknown> {
  return {
    id: inv.id,
    invoice_number: inv.invoice_number,
    customer: inv.customer_id,
    customer_name: inv.customer ? fullName(inv.customer) : null,
    payment: inv.payment_id,
    license: inv.license_id,
    amount: toNumber(inv.amount),
    status: inv.status,
    due_date: isoDate(inv.due_date),
    paid_at: isoDateTime(inv.paid_at),
    created_at: isoDateTime(inv.created_at),
  };
}

export function serializeAuditLog(log: AuditLog & { admin?: UserLike | null }): Record<string, unknown> {
  return {
    id: log.id,
    admin: log.admin_id,
    admin_name: log.admin ? fullName(log.admin) : null,
    admin_email: log.admin?.email ?? null,
    action: log.action,
    resource_type: log.resource_type,
    resource_id: log.resource_id,
    details: parseJsonObject(log.details),
    before_state: parseJsonObject(log.before_state),
    after_state: parseJsonObject(log.after_state),
    ip_address: log.ip_address,
    user_agent: log.user_agent,
    created_at: isoDateTime(log.created_at),
  };
}

export function serializeAdminSession(s: AdminSession & { admin?: UserLike | null }): Record<string, unknown> {
  return {
    id: s.id,
    admin: s.admin_id,
    admin_name: s.admin ? fullName(s.admin) : null,
    ip_address: s.ip_address,
    user_agent: s.user_agent,
    login_time: isoDateTime(s.login_time),
    logout_time: isoDateTime(s.logout_time),
    is_active: s.is_active,
  };
}

export function serializeAppVersion(v: AppVersion): Record<string, unknown> {
  return {
    id: v.id,
    platform: v.platform,
    version: v.version,
    min_version: v.min_version,
    is_force_update: v.is_force_update,
    release_notes: v.release_notes,
    download_url: v.download_url,
    created_at: isoDateTime(v.created_at),
  };
}

export function serializeSystemSetting(s: SystemSetting): Record<string, unknown> {
  return {
    id: s.id,
    key: s.key,
    value: s.value,
    type: s.type,
    description: s.description,
    created_at: isoDateTime(s.created_at),
    updated_at: isoDateTime(s.updated_at),
  };
}

export function serializeNotification(n: Notification & { recipient?: UserLike | null }): Record<string, unknown> {
  return {
    id: n.id,
    recipient: n.recipient_id,
    notification_type: n.notification_type,
    title: n.title,
    message: n.message,
    is_read: n.is_read,
    link: n.link,
    created_at: isoDateTime(n.created_at),
  };
}

// ─── date/number helpers (DRF-compatible) ────────────────────────────────────

export function isoDateTime(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString();
}

export function isoDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value === "object" && value !== null && typeof (value as { toString?: unknown }).toString === "function") {
    const n = Number.parseFloat(String((value as { toString(): string }).toString()));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function daysRemaining(expiry: Date | null | undefined): number {
  if (!expiry) return 0;
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const expiryDay = new Date(Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), expiry.getUTCDate()));
  return Math.max(Math.floor((expiryDay.getTime() - today.getTime()) / 86400000), 0);
}

export function parseJsonObject(value: unknown): unknown {
  if (typeof value !== "string") return value ?? {};
  try {
    const parsed = JSON.parse(value);
    return parsed ?? {};
  } catch {
    return {};
  }
}