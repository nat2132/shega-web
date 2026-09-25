import { prisma } from "../../lib/prisma";
import { ADDON_TYPES, baseCaps } from "../../lib/pricing";

/** Mirrors licenses.utils.generate_license_key: ERP-XXXX-XXXX-XXXX */
export function generateLicenseKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const group = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `ERP-${group()}-${group()}-${group()}`;
}

/** Mirrors payments.utils.generate_transaction_id */
export function generateTransactionId(): string {
  const hex = Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * 16).toString(16).toUpperCase(),
  ).join("");
  return `TXN-${hex}`;
}

/** Mirrors payments.utils.generate_invoice_number */
export function generateInvoiceNumber(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 16).toString(16).toUpperCase(),
  ).join("");
  return `INV-${stamp}-${rand}`;
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function markPaidInvoice(tx: Tx, paymentId: number, customerId: number, licenseId: number, amount: any, now: Date): Promise<void> {
  const existing = await tx.invoice.findUnique({ where: { payment_id: paymentId } });
  if (existing) return;
  await tx.invoice.create({
    data: {
      invoice_number: generateInvoiceNumber(),
      customer_id: customerId,
      payment_id: paymentId,
      license_id: licenseId,
      amount,
      status: "paid",
      due_date: now,
      paid_at: now,
      created_at: now,
    },
  });
}

const ACTIVE_STATUSES = ["active"] as const;

/**
 * Applies an approved payment transactionally (mirrors
 * payments.utils.process_approved_payment):
 *
 *  - add-on payments (additional_*_device/business): increment the matching
 *    license cap counter by `quantity`; no expiry change.
 *  - subscription/renewal: create a license when none exists for the plan, or
 *    extend the customer's existing license from its current expiry.
 *  - always creates the paid Invoice for the payment.
 *
 * Returns the affected license id (or null when nothing could be applied).
 */
export async function processApprovedPayment(
  paymentId: number,
  opts: { maxKeyAttempts?: number } = {},
): Promise<{ id: number; kind: "created" | "renewed" | "addon" } | null> {
  const { maxKeyAttempts = 5 } = opts;

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { plan: true, license: true },
    });
    if (!payment) return null;

    const now = new Date();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const agentId = payment.reviewed_by_id ?? undefined;

    // ── add-on purchases ────────────────────────────────────────────────
    if (payment.payment_type in ADDON_TYPES) {
      // Without an explicit license the add-on still targets the customer's
      // most recent license so a standalone add-on purchase is never silently
      // dropped after approval.
      const addonLicenseId =
        payment.license_id ??
        (
          await tx.license.findFirst({
            where: { customer_id: payment.customer_id },
            orderBy: { created_at: "desc" },
          })
        )?.id;
      if (!addonLicenseId) return null;
      const license = await tx.license.findUnique({ where: { id: addonLicenseId } });
      if (!license) return null;
      const meta = ADDON_TYPES[payment.payment_type as keyof typeof ADDON_TYPES];
      const quantity = Math.max(1, payment.quantity);
      await tx.license.update({
        where: { id: license.id },
        data: {
          [meta.key]: { increment: quantity },
          status: license.status === "expired" ? "active" : license.status,
          updated_at: now,
        },
      });
      if (!payment.license_id) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { license_id: license.id, updated_at: now },
        });
      }
      await tx.licenseAuditLog.create({
        data: {
          license_id: license.id,
          action: "addon_added",
          details: JSON.stringify({ payment_id: payment.id, type: meta.label, quantity }),
          created_by_id: agentId,
          created_at: now,
        },
      });
      await markPaidInvoice(tx, payment.id, payment.customer_id, license.id, payment.amount, now);
      return { id: license.id, kind: "addon" };
    }

    // ── base subscription / renewal ──────────────────────────────────────
    if (!payment.plan) return null;
    const durationDays = payment.plan.duration_months * 30;

    let licenseId = payment.license_id;
    if (!licenseId) {
      // Reuse the customer's most recent license for this plan regardless of
      // status. Renewing an EXPIRED license must keep its accumulated
      // add-on caps — a fresh license would silently wipe them.
      const priorForPlan = await tx.license.findFirst({
        where: { customer_id: payment.customer_id, plan_id: payment.plan.id },
        orderBy: { created_at: "desc" },
      });
      if (priorForPlan) licenseId = priorForPlan.id;
    }

    if (licenseId) {
      const licenseInstance = await tx.license.findUnique({ where: { id: licenseId } });
      if (!licenseInstance) return null;
      const baseExpiry =
        licenseInstance.expiry_date && licenseInstance.expiry_date > today
          ? new Date(licenseInstance.expiry_date)
          : today;
      const newExpiry = new Date(baseExpiry.getTime() + durationDays * 86400000);
      // A customer who pays during/after the trial becomes a real subscriber:
      // clear is_trial (and reset start_date) so the resolver reports 'active'
      // instead of keeping them stuck in 'trial' forever.
      const wasTrial = Boolean(licenseInstance.is_trial);
      await tx.license.update({
        where: { id: licenseInstance.id },
        data: {
          expiry_date: newExpiry,
          status: licenseInstance.status === "expired" || licenseInstance.status === "revoked" || licenseInstance.status === "suspended"
            ? "active"
            : licenseInstance.status,
          is_trial: wasTrial ? false : licenseInstance.is_trial,
          start_date: wasTrial ? today : licenseInstance.start_date,
          updated_at: now,
        },
      });
      await tx.licenseAuditLog.create({
        data: {
          license_id: licenseInstance.id,
          action: payment.payment_type === "renewal" ? "renewed" : "payment_applied",
          details: JSON.stringify({ payment_id: payment.id, expiry_date: newExpiry.toISOString().slice(0, 10) }),
          created_by_id: agentId,
          created_at: now,
        },
      });
      if (payment.license_id !== licenseInstance.id) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { license_id: licenseInstance.id, updated_at: now },
        });
      }
      await markPaidInvoice(tx, payment.id, payment.customer_id, licenseInstance.id, payment.amount, now);
      return { id: licenseInstance.id, kind: "renewed" };
    }

    // ── brand-new license ────────────────────────────────────────────────
    let key = generateLicenseKey();
    let attempts = 0;
    while (attempts < maxKeyAttempts) {
      const clash = await tx.license.findUnique({ where: { license_key: key } });
      if (!clash) break;
      key = generateLicenseKey();
      attempts += 1;
    }

    const expiry = new Date(today.getTime() + durationDays * 86400000);
    const caps = baseCaps(payment.plan);
    const license = await tx.license.create({
      data: {
        license_key: key,
        customer_id: payment.customer_id,
        plan_id: payment.plan.id,
        status: "active",
        start_date: today,
        expiry_date: expiry,
        device_limit: payment.plan.device_limit,
        max_mobile_devices: caps.mobile,
        max_desktop_devices: caps.desktop,
        max_businesses: caps.businesses,
        is_trial: false,
        notes: "",
        created_at: now,
        updated_at: now,
      },
    });

    await tx.payment.update({
      where: { id: payment.id },
      data: { license_id: license.id, updated_at: now },
    });
    await tx.licenseAuditLog.create({
      data: {
        license_id: license.id,
        action: "activated",
        details: JSON.stringify({ payment_id: payment.id }),
        created_by_id: agentId,
        created_at: now,
      },
    });
    await markPaidInvoice(tx, payment.id, payment.customer_id, license.id, payment.amount, now);

    return { id: license.id, kind: "created" };
  });
}