import type { License, Plan } from "@prisma/client";

/**
 * Shega entitlement + pricing engine.
 *
 * A subscription (license) carries three counter caps derived from its plan:
 *   - mobile devices, desktop devices, businesses
 * Base caps come from the plan's `included_*` fields. Approved add-on payments
 * increment the license-level `max_*` counters. The server always computes
 * amounts and caps — client-submitted amounts are never trusted.
 */

export type AddonKind = "mobile" | "desktop" | "businesses";

export const ADDON_TYPES = {
  additional_mobile_device: {
    kind: "mobile" as AddonKind,
    key: "max_mobile_devices",
    label: "Additional mobile device",
  },
  additional_desktop_device: {
    kind: "desktop" as AddonKind,
    key: "max_desktop_devices",
    label: "Additional desktop device",
  },
  additional_business: {
    kind: "businesses" as AddonKind,
    key: "max_businesses",
    label: "Additional business",
  },
} as const;

export type AddonPaymentType = keyof typeof ADDON_TYPES;
export type PaymentType = "subscription" | "renewal" | AddonPaymentType;

export const SUBSCRIPTION_PAYMENT_TYPES: readonly PaymentType[] = ["subscription", "renewal"];
export const DEVICE_TYPES = ["MOBILE", "DESKTOP"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export interface Caps {
  mobile: number;
  desktop: number;
  businesses: number;
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

export function baseCaps(
  plan: Pick<
    Plan,
    "included_mobile_devices" | "included_desktop_devices" | "included_businesses"
  >,
): Caps {
  return {
    mobile: plan.included_mobile_devices,
    desktop: plan.included_desktop_devices,
    businesses: plan.included_businesses,
  };
}

export function licenseCaps(
  license: Pick<License, "max_mobile_devices" | "max_desktop_devices" | "max_businesses">,
): Caps {
  return {
    mobile: license.max_mobile_devices,
    desktop: license.max_desktop_devices,
    businesses: license.max_businesses,
  };
}

/** Add-ons owned on top of the plan's base allocation. */
export function ownedExtras(plan: Parameters<typeof baseCaps>[0], caps: Caps): Caps {
  const base = baseCaps(plan);
  return {
    mobile: Math.max(0, caps.mobile - base.mobile),
    desktop: Math.max(0, caps.desktop - base.desktop),
    businesses: Math.max(0, caps.businesses - base.businesses),
  };
}

export function addonPrice(plan: Plan, kind: AddonKind): number {
  switch (kind) {
    case "mobile":
      return toNumber(plan.addon_mobile_price);
    case "desktop":
      return toNumber(plan.addon_desktop_price);
    case "businesses":
      return toNumber(plan.addon_business_price);
  }
}

export function priceForAddonPayment(plan: Plan, type: AddonPaymentType): number {
  return addonPrice(plan, ADDON_TYPES[type].kind);
}

/** Monthly subscription total: base plan price + per-device/business add-ons. */
export function monthlyTotal(
  plan: Plan,
  extras: Partial<Caps> = {},
  includeBase = true,
): number {
  const base = includeBase ? toNumber(plan.price) : 0;
  return (
    base +
    toNumber(plan.addon_mobile_price) * (extras.mobile ?? 0) +
    toNumber(plan.addon_desktop_price) * (extras.desktop ?? 0) +
    toNumber(plan.addon_business_price) * (extras.businesses ?? 0)
  );
}

/**
 * Device-limit check keyed by device type (mirrors licenses.utils.check_device_limit
 * but splits the count by MOBILE/DESKTOP). The per-type cap on a license is
 * derived from the plan's `included_*` slots; a cap of 0 means the platform is
 * NOT included in the plan (e.g. a Desktop plan has 0 mobile slots), so any
 * activation of that type is rejected. Add-on payments raise the cap.
 */
export function deviceLimited(license: Pick<License, "max_mobile_devices" | "max_desktop_devices">, active: number, deviceType: DeviceType): boolean {
  const cap = deviceType === "DESKTOP" ? license.max_desktop_devices : license.max_mobile_devices;
  if (cap === 0) return true;
  return active >= cap;
}