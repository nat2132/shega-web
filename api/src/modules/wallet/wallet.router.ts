import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { wrap, badRequest, notFound } from "../../lib/errors";
import { ADDON_TYPES, baseCaps, licenseCaps, monthlyTotal, ownedExtras, priceForAddonPayment, type AddonPaymentType } from "../../lib/pricing";
import { resolveSubscriptionStatus } from "../../lib/subscription";
import { generateLicenseKey, generateTransactionId } from "../payments/payments.service";

/**
 * Mobile/desktop payment + subscription endpoints. Mirrors the Django contract
 * (payments/views.py MobilePaymentCreateView/MobileMyPaymentView and
 * api_public.views.SubscriptionStatusView):
 *   POST /api/payments/create
 *   GET  /api/payments/my-payment
 *   GET  /api/subscription/status
 *
 * Amounts are always computed server-side from the plan + owned add-ons.
 */
export const walletRouter = Router();
walletRouter.use(requireAuth);

const DAILY_SUBMISSION_LIMIT = 3;

const createPaymentSchema = z.object({
  plan_id: z.coerce.number().int().positive(),
  transaction_id: z.string().min(1),
  payment_method: z.string().min(1).optional().default("telebirr"),
  license_id: z.coerce.number().int().positive().optional(),
  payment_type: z
    .enum(["subscription", "renewal", "additional_mobile_device", "additional_desktop_device", "additional_business"])
    .optional().default("subscription"),
  quantity: z.coerce.number().int().min(1).max(100).optional().default(1),
});

walletRouter.post("/create", wrap(async (req: Request, res: Response) => {
  const parsed = createPaymentSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = String(issue?.path[0] ?? "detail");
    res.status(400).json({ [field]: [issue?.message ?? "Invalid value."] });
    return;
  }
  const data = parsed.data;
  const uid = req.user!.id;

  const plan = await prisma.plan.findUnique({ where: { id: data.plan_id } });
  if (!plan || !plan.is_active) {
    res.status(400).json({ plan_id: ["Invalid plan selected."] });
    return;
  }

  const isAddon = data.payment_type in ADDON_TYPES;

  const dup = await prisma.payment.findFirst({
    where: { customer_id: uid, transaction_id: data.transaction_id },
  });
  if (dup) {
    res.status(400).json({ transaction_id: ["This transaction number has already been submitted."] });
    return;
  }

  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  const submissionsToday = await prisma.payment.count({ where: { customer_id: uid, created_at: { gte: dayAgo } } });
  if (submissionsToday >= DAILY_SUBMISSION_LIMIT) {
    res.status(429).json({
      detail: `You may submit a maximum of ${DAILY_SUBMISSION_LIMIT} payments per day. Please wait before submitting again.`,
    });
    return;
  }

  if (!isAddon) {
    const pending = await prisma.payment.findFirst({
      where: { customer_id: uid, plan_id: plan.id, status: "pending" },
    });
    if (pending) {
      res.status(409).json({
        detail: "You already have a pending payment for this plan. Please wait for it to be reviewed before submitting another.",
        plan_id: [plan.id],
      });
      return;
    }
  }

  const now = new Date();
  let amount = 0;
  let licenseId: number | null = null;
  let description = "";
  let quantity = data.quantity;

  if (isAddon) {
    // Standalone add-on purchase: target the customer's current active
    // license so clients don't need to know their license id.
    const license = data.license_id
      ? await prisma.license.findFirst({ where: { id: data.license_id, customer_id: uid, status: "active" } })
      : await prisma.license.findFirst({
          where: { customer_id: uid, status: "active", expiry_date: { not: null, gte: new Date() } },
          orderBy: { created_at: "desc" },
        });
    if (!license) throw badRequest("An active subscription is required to purchase an add-on.");
    licenseId = license.id;
    amount = priceForAddonPayment(plan, data.payment_type as AddonPaymentType) * quantity;
    description = `${ADDON_TYPES[data.payment_type as AddonPaymentType].label} x${quantity}`;
  } else {
    let extras = { mobile: 0, desktop: 0, businesses: 0 };
    if (data.license_id) {
      const lic = await prisma.license.findFirst({ where: { id: data.license_id, customer_id: uid } });
      if (!lic) throw notFound("License not found.");
      licenseId = lic.id;
      extras = ownedExtras(plan, licenseCaps(lic));
    }
    amount = monthlyTotal(plan, extras);
    description = `${plan.name} subscription (monthly)`;
  }

  const payment = await prisma.payment.create({
    data: {
      customer_id: uid,
      plan_id: plan.id,
      license_id: licenseId,
      amount,
      transaction_id: data.transaction_id,
      receipt_image: null,
      payment_method: data.payment_method,
      payment_type: data.payment_type,
      quantity,
      description,
      status: "pending",
      admin_notes: "",
      created_at: now,
      updated_at: now,
    },
  });

  res.status(201).json({
    id: payment.id,
    plan_id: plan.id,
    plan_name: plan.name,
    transaction_id: payment.transaction_id,
    amount: Number(payment.amount),
    status: payment.status,
    payment_type: payment.payment_type,
    quantity: payment.quantity,
    description: payment.description,
    created_at: payment.created_at,
  });
}));

walletRouter.get("/my-payment", wrap(async (req: Request, res: Response) => {
  const payment = await prisma.payment.findFirst({
    where: { customer_id: req.user!.id },
    include: { plan: true, license: true },
    orderBy: { created_at: "desc" },
  });
  if (!payment) {
    res.json({ id: null, plan_id: null, plan_name: null, transaction_id: null, amount: null, status: "none", reason: null, created_at: null });
    return;
  }
  res.json({
    id: payment.id,
    plan_id: payment.plan_id,
    plan_name: payment.plan?.name ?? null,
    transaction_id: payment.transaction_id,
    amount: Number(payment.amount),
    status: payment.status,
    payment_type: payment.payment_type,
    quantity: payment.quantity,
    reason: payment.admin_notes || null,
    created_at: payment.created_at,
  });
}));

export const publicWalletRouter = Router();

/** Mirrors api_publicSubscriptionStatusView: single shared status engine. */
publicWalletRouter.get("/status", requireAuth, wrap(async (req: Request, res: Response) => {
  res.json(await resolveSubscriptionStatus(req.user!.id));
}));

const TRIAL_DAYS = 7;

const trialSchema = z.object({
  plan_id: z.coerce.number().int().positive(),
});

/**
 * Start the customer's 7-day trial on a plan they pick at signup. One trial per
 * account, only before any subscription/payment exists. Returns the same
 * enriched payload as GET /subscription/status so clients reconcile directly.
 */
publicWalletRouter.post("/trial", requireAuth, wrap(async (req: Request, res: Response) => {
  const parsed = trialSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = String(issue?.path[0] ?? "detail");
    res.status(400).json({ [field]: [issue?.message ?? "Invalid value."] });
    return;
  }
  const uid = req.user!.id;

  const pending = await prisma.payment.findFirst({ where: { customer_id: uid, status: "pending" } });
  if (pending) {
    res.status(409).json({ detail: "You have a payment awaiting review. Complete it before starting a trial." });
    return;
  }

  const existing = await prisma.license.findFirst({ where: { customer_id: uid } });
  if (existing) {
    if (existing.is_trial) {
      res.status(409).json({ detail: "Your 7-day trial has already been used for this account." });
    } else {
      res.status(409).json({ detail: "This account already has a subscription." });
    }
    return;
  }

  const plan = await prisma.plan.findUnique({ where: { id: parsed.data.plan_id } });
  if (!plan || !plan.is_active) {
    res.status(400).json({ plan_id: ["Invalid plan selected."] });
    return;
  }

  const now = new Date();
  const expiry = new Date(now.getTime() + TRIAL_DAYS * 24 * 3600_000);
  const caps = baseCaps(plan);

  await prisma.$transaction(async (tx) => {
    const license = await tx.license.create({
      data: {
        license_key: generateLicenseKey(),
        customer_id: uid,
        plan_id: plan.id,
        status: "active",
        start_date: now,
        expiry_date: expiry,
        device_limit: plan.device_limit,
        max_mobile_devices: caps.mobile,
        max_desktop_devices: caps.desktop,
        max_businesses: caps.businesses,
        is_trial: true,
        notes: `7-day free trial — ${plan.name}`,
        created_at: now,
        updated_at: now,
      },
    });
    await tx.licenseAuditLog.create({
      data: {
        license_id: license.id,
        action: "trial_started",
        details: JSON.stringify({ plan: plan.name, plan_id: plan.id }),
        ip_address: req.ip ?? null,
        created_by_id: uid,
        created_at: now,
      },
    });
  });

  res.status(201).json(await resolveSubscriptionStatus(uid));
}));

export { generateTransactionId };