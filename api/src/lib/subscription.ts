import type { License, Payment, Plan } from "@prisma/client";
import { prisma } from "./prisma";
import { licenseCaps, ownedExtras, monthlyTotal, toNumber } from "./pricing";
import { daysRemaining } from "./serializers";

/**
 * Unified subscription state for the Shega backend — the single source of
 * truth for Mobile, Desktop and the web. Canonical statuses:
 *
 *   none             no license and no payments yet  (onboarding)
 *   trial            7-day trial active, full access
 *   pending_payment  payment awaiting admin approval, view-only
 *   payment_rejected latest payment rejected, view-only until resubmission
 *   active           subscription active, full access
 *   expired          subscription lapsed, view-only
 *
 * Precedence: an active/trial license always wins (a pending renewal or
 * rejected add-on must never lock an active subscriber out). The remaining
 * states only apply when there is no usable license.
 */

export type SubscriptionAccess = "full" | "view_only";
export type SubscriptionStatus =
  | "none"
  | "trial"
  | "pending_payment"
  | "payment_rejected"
  | "active"
  | "expired";

export interface DeviceUsage {
  allocated: number;
  used: number;
}

export interface PendingPaymentInfo {
  payment_id: number;
  amount: number;
  plan_id: number | null;
  plan: string | null;
  plan_name: string | null;
  payment_method: string;
  payment_type: string;
  description: string;
  created_at: Date;
}

export interface LastPaymentInfo {
  payment_id: number;
  amount: number;
  status: string;
  reason: string | null;
  created_at: Date;
}

export interface SubscriptionStatusPayload {
  status: SubscriptionStatus;
  access: SubscriptionAccess;
  plan: string | null;
  plan_name: string | null;
  plan_id: number | null;
  license_key: string | null;
  started_at: Date | null;
  expires_at: Date | null;
  days_remaining: number;
  is_trial: boolean;
  trial_days_remaining: number;
  devices: { mobile: DeviceUsage; desktop: DeviceUsage };
  businesses: { allocated: number; used: number };
  monthly: {
    base_price: number;
    additional_mobile_devices: number;
    additional_desktop_devices: number;
    additional_businesses: number;
    total: number;
  };
  pending_payment: PendingPaymentInfo | null;
  last_payment: LastPaymentInfo | null;
}

type LicenseWithPlan = License & { plan?: Plan | null; device_activations?: { device_type: string | null }[] | null };

export async function resolveSubscriptionStatus(customerId: number): Promise<SubscriptionStatusPayload> {
  const [license, pendingPayment, latestRejected, businessCount, activeDevices] = await Promise.all([
    prisma.license.findFirst({
      where: { customer_id: customerId },
      include: { plan: true, device_activations: { where: { is_active: true } } },
      orderBy: { created_at: "desc" },
    }),
    prisma.payment.findFirst({
      where: { customer_id: customerId, status: "pending" },
      include: { plan: true },
      orderBy: { created_at: "desc" },
    }),
    prisma.payment.findFirst({
      where: { customer_id: customerId, status: "rejected" },
      include: { plan: true },
      orderBy: { created_at: "desc" },
    }),
    prisma.businessMembership.count({ where: { user_id: customerId, is_active: true } }),
    prisma.deviceActivation.findMany({ where: { license: { customer_id: customerId }, is_active: true } }),
  ]);

  const usable = (l: License | null): l is License =>
    Boolean(l) && l!.status === "active" && l!.expiry_date !== null && l!.expiry_date >= todayStart();

  if (usable(license)) {
    const used = { mobile: countDevices(activeDevices, "MOBILE"), desktop: countDevices(activeDevices, "DESKTOP") };
    return basePayload(license, license.is_trial ? "trial" : "active", businessCount, used, pendingPayment);
  }

  if (license) {
    if (pendingPayment) return basePayload(license, "pending_payment", businessCount, { mobile: 0, desktop: 0 }, pendingPayment);
    if (latestRejected) {
      const base = basePayload(license, "payment_rejected", businessCount, { mobile: 0, desktop: 0 }, pendingPayment);
      base.last_payment = toLastPayment(latestRejected);
      return base;
    }
    return basePayload(license, "expired", businessCount, { mobile: 0, desktop: 0 }, pendingPayment);
  }

  if (pendingPayment) return emptyPayload({ status: "pending_payment", pending_payment: toPending(pendingPayment) });

  if (latestRejected) return emptyPayload({ status: "payment_rejected", last_payment: toLastPayment(latestRejected) });

  return emptyPayload({ status: "none" });
}

function todayStart(): Date {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

function countDevices(devices: { device_type: string | null }[], type: string): number {
  return devices.filter((d) => d.device_type === type).length;
}

function toPending(p: Payment & { plan?: Plan | null }): PendingPaymentInfo {
  return {
    payment_id: p.id,
    amount: Number(p.amount),
    plan_id: p.plan_id,
    plan: p.plan?.name ?? null,
    plan_name: p.plan?.name ?? null,
    payment_method: p.payment_method,
    payment_type: p.payment_type,
    description: p.description,
    created_at: p.created_at,
  };
}

function toLastPayment(p: Payment): LastPaymentInfo {
  return {
    payment_id: p.id,
    amount: Number(p.amount),
    status: p.status,
    reason: p.admin_notes ?? null,
    created_at: p.created_at,
  };
}

function basePayload(
  license: LicenseWithPlan,
  status: SubscriptionStatus,
  businessCount: number,
  used: { mobile: number; desktop: number },
  pendingPayment: (Payment & { plan?: Plan | null }) | null,
): SubscriptionStatusPayload {
  const plan = license.plan ?? null;
  const caps = licenseCaps(license);
  const extras = plan ? ownedExtras(plan, caps) : { mobile: 0, desktop: 0, businesses: 0 };
  const remaining = daysRemaining(license.expiry_date);
  const basePrice = plan ? toNumber(plan.price) : 0;

  return {
    status,
    access: status === "active" || status === "trial" ? "full" : "view_only",
    plan: plan?.name ?? null,
    plan_name: plan?.name ?? null,
    plan_id: plan?.id ?? null,
    license_key: license.license_key,
    started_at: license.start_date,
    expires_at: license.expiry_date,
    days_remaining: remaining,
    is_trial: Boolean(license.is_trial),
    trial_days_remaining: license.is_trial ? remaining : 0,
    devices: {
      mobile: { allocated: caps.mobile, used: used.mobile },
      desktop: { allocated: caps.desktop, used: used.desktop },
    },
    businesses: { allocated: caps.businesses, used: businessCount },
    monthly: {
      base_price: basePrice,
      additional_mobile_devices: plan ? toNumber(plan.addon_mobile_price) * extras.mobile : 0,
      additional_desktop_devices: plan ? toNumber(plan.addon_desktop_price) * extras.desktop : 0,
      additional_businesses: plan ? toNumber(plan.addon_business_price) * extras.businesses : 0,
      total: plan ? monthlyTotal(plan, extras) : 0,
    },
    pending_payment: pendingPayment ? toPending(pendingPayment) : null,
    last_payment: null,
  };
}

function emptyPayload(
  overrides: Partial<Omit<SubscriptionStatusPayload, "status" | "access">> & { status: SubscriptionStatus },
): SubscriptionStatusPayload {
  return {
    ...{
      status: overrides.status,
      access: overrides.status === "active" || overrides.status === "trial" ? "full" : "view_only",
      plan: null,
      plan_name: null,
      plan_id: null,
      license_key: null,
      started_at: null,
      expires_at: null,
      days_remaining: 0,
      is_trial: false,
      trial_days_remaining: 0,
      devices: { mobile: { allocated: 0, used: 0 }, desktop: { allocated: 0, used: 0 } },
      businesses: { allocated: 0, used: 0 },
      monthly: {
        base_price: 0,
        additional_mobile_devices: 0,
        additional_desktop_devices: 0,
        additional_businesses: 0,
        total: 0,
      },
      pending_payment: null,
      last_payment: null,
    },
    ...overrides,
  };
}