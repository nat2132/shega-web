import { prisma } from "../../lib/prisma";

/** Mirrors licenses.utils.generate_license_key: ERP-XXXX-XXXX-XXXX */
export function generateLicenseKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const group = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `ERP-${group()}-${group()}-${group()}`;
}

/**
 * Mirrors payments.utils.process_approved_payment (transactional):
 * renew an existing license for the plan, or create a new one when none
 * currently covers that plan for the customer.
 */
export async function processApprovedPayment(
  paymentId: number,
  opts: { maxKeyAttempts?: number } = {},
): Promise<{ id: number } | null> {
  const { maxKeyAttempts = 5 } = opts;

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { plan: true, license: true },
    });
    if (!payment || !payment.plan) return null;

    const durationDays = payment.plan.duration_months * 30;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (payment.license_id) {
      const licenseInstance = payment.license;
      if (!licenseInstance) return null;
      const baseExpiry =
        licenseInstance.expiry_date && licenseInstance.expiry_date > today
          ? new Date(licenseInstance.expiry_date)
          : today;
      const newExpiry = new Date(baseExpiry.getTime() + durationDays * 86400000);
      await tx.license.update({
        where: { id: licenseInstance.id },
        data: {
          expiry_date: newExpiry,
          status: licenseInstance.status === "expired" || licenseInstance.status === "revoked" ? "active" : licenseInstance.status,
          updated_at: new Date(),
        },
      });
      return { id: licenseInstance.id };
    }

    const activeForPlan = await tx.license.findFirst({
      where: {
        customer_id: payment.customer_id,
        plan_id: payment.plan!.id,
        status: "active",
        expiry_date: { gt: today },
      },
    });
    if (activeForPlan) return null;

    let key = generateLicenseKey();
    let attempts = 0;
    while (attempts < maxKeyAttempts) {
      const clash = await tx.license.findUnique({ where: { license_key: key } });
      if (!clash) break;
      key = generateLicenseKey();
      attempts += 1;
    }

    const expiry = new Date(today.getTime() + durationDays * 86400000);
    const now = new Date();
    const license = await tx.license.create({
      data: {
        license_key: key,
        customer_id: payment.customer_id,
        plan_id: payment.plan!.id,
        status: "active",
        start_date: today,
        expiry_date: expiry,
        device_limit: payment.plan.device_limit,
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

    return { id: license.id };
  });
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