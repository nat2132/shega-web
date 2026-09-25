import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { wrap, badRequest, notFound } from "../../lib/errors";
import {
  serializeDeviceActivation,
  serializeInvoice,
  serializeLicense,
  serializePlan,
  serializePaymentDetail,
  serializePaymentList,
  serializeUser,
} from "../../lib/serializers";
import {
  ADDON_TYPES,
  licenseCaps,
  monthlyTotal,
  ownedExtras,
  priceForAddonPayment,
  type AddonPaymentType,
} from "../../lib/pricing";
import { resolveSubscriptionStatus } from "../../lib/subscription";
import { generateTransactionId } from "../payments/payments.service";

export const customerRouter = Router();
customerRouter.use(requireAuth);

customerRouter.get("/dashboard", wrap(async (req: Request, res: Response) => {
  const [user, licenses, payments, latestRelease, notifications] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user!.id } }),
    prisma.license.findMany({ where: { customer_id: req.user!.id }, include: { plan: true }, orderBy: { created_at: "desc" } }),
    prisma.payment.findMany({ where: { customer_id: req.user!.id }, include: { plan: true, license: true }, orderBy: { created_at: "desc" }, take: 10 }),
    prisma.appVersion.findFirst({ orderBy: { created_at: "desc" } }),
    prisma.notification.findMany({ where: { recipient_id: req.user!.id }, orderBy: { created_at: "desc" }, take: 10 }),
  ]);
  if (!user) throw notFound("User not found.");

  const active = licenses.filter((license) => license.status === "active");
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const activeWithExpiry = active.filter((license) => license.expiry_date);
  const expiring = activeWithExpiry.filter(
    (license) => license.expiry_date! <= in30Days && license.expiry_date! >= now,
  ).length;
  const nextRenewal = activeWithExpiry.length
    ? activeWithExpiry.reduce((a, b) => (a.expiry_date! < b.expiry_date! ? a : b)).expiry_date
    : null;

  res.json({
    user: serializeUser(user),
    licenses: licenses.map((license) => serializeLicense(license)),
    payments: payments.map((payment) => serializePaymentList(payment)),
    active_licenses: active.length,
    expiring_soon: expiring,
    total_payments: payments.length,
    next_renewal: nextRenewal,
    recent_activity: notifications.map((notification) => ({
      id: notification.id,
      type: notification.notification_type ?? "info",
      title: notification.title,
      message: notification.message,
      created_at: notification.created_at,
    })),
    latest_version: latestRelease?.version ?? null,
    download_url: latestRelease?.download_url ?? "",
  });
}));

customerRouter.get("/licenses", wrap(async (req: Request, res: Response) => {
  const results = await prisma.license.findMany({ where: { customer_id: req.user!.id }, include: { plan: true }, orderBy: { created_at: "desc" } });
  res.json(results.map((license) => serializeLicense(license)));
}));

customerRouter.get("/licenses/:id(\\d+)", wrap(async (req: Request, res: Response) => {
  const license = await prisma.license.findFirst({ where: { id: Number(req.params.id), customer_id: req.user!.id }, include: { plan: true } });
  if (!license) throw notFound("License not found.");
  res.json(serializeLicense(license));
}));

customerRouter.get("/licenses/:id(\\d+)/devices", wrap(async (req: Request, res: Response) => {
  const results = await prisma.deviceActivation.findMany({ where: { license_id: Number(req.params.id), license: { customer_id: req.user!.id } }, include: { license: true }, orderBy: { last_seen: "desc" } });
  res.json(results.map((device) => serializeDeviceActivation(device)));
}));

customerRouter.get("/licenses/:id(\\d+)/payments", wrap(async (req: Request, res: Response) => {
  const results = await prisma.payment.findMany({ where: { license_id: Number(req.params.id), customer_id: req.user!.id }, include: { plan: true, license: true }, orderBy: { created_at: "desc" } });
  res.json(results.map((payment) => serializePaymentList(payment)));
}));

customerRouter.get("/payments", wrap(async (req: Request, res: Response) => {
  const results = await prisma.payment.findMany({ where: { customer_id: req.user!.id }, include: { plan: true, license: true }, orderBy: { created_at: "desc" } });
  res.json(results.map((payment) => serializePaymentList(payment)));
}));

const paymentSchema = z.object({
  plan: z.coerce.number().int().positive().optional(),
  payment_method: z.string().min(1),
  payment_type: z
    .enum(["subscription", "renewal", "additional_mobile_device", "additional_desktop_device", "additional_business"])
    .default("subscription"),
  license_id: z.coerce.number().int().positive().optional(),
  quantity: z.coerce.number().int().min(1).max(100).optional().default(1),
  transaction_id: z.string().min(1).optional(),
});

/**
 * Customer-created payment. The server computes the amount:
 *  - subscription/renewal => plan base + add-ons already owned on the license
 *  - add-on purchases    => the plan's per-device/business add-on price x qty
 */
customerRouter.post("/payments", wrap(async (req: Request, res: Response) => {
  const parsed = paymentSchema.safeParse(req.body ?? {});
  if (!parsed.success) throw badRequest("Invalid payment data.");
  const data = parsed.data;
  const uid = req.user!.id;
  const now = new Date();

  const isAddon = data.payment_type in ADDON_TYPES;
  let amount = 0;
  let planId: number | null = null;
  let licenseId: number | null = null;
  let description = "";
  let transactionId = data.transaction_id;

  if (transactionId) {
    const dup = await prisma.payment.findFirst({ where: { customer_id: uid, transaction_id: transactionId } });
    if (dup) throw badRequest("This transaction number has already been submitted.");
  } else {
    transactionId = generateTransactionId();
  }

  if (isAddon) {
    const license = data.license_id
      ? await prisma.license.findFirst({ where: { id: data.license_id, customer_id: uid, status: "active" }, include: { plan: true } })
      : await prisma.license.findFirst({
          where: { customer_id: uid, status: "active", expiry_date: { not: null, gte: new Date() } },
          include: { plan: true },
          orderBy: { created_at: "desc" },
        });
    if (!license || !license.plan) throw badRequest("An active subscription is required to purchase an add-on.");
    licenseId = license.id;
    planId = license.plan_id;
    amount = priceForAddonPayment(license.plan, data.payment_type as AddonPaymentType) * data.quantity;
    description = `${ADDON_TYPES[data.payment_type as AddonPaymentType].label} x${data.quantity}`;
  } else {
    let plan = data.plan
      ? await prisma.plan.findUnique({ where: { id: data.plan } })
      : null;
    if (data.license_id && !plan) {
      const lic = await prisma.license.findFirst({ where: { id: data.license_id, customer_id: uid } });
      if (!lic) throw notFound("License not found.");
      licenseId = lic.id;
      plan = await prisma.plan.findUnique({ where: { id: lic.plan_id } });
    }
    if (!plan) throw badRequest("plan or license_id is required.");
    if (!plan.is_active) throw badRequest("That plan is not available.");
    planId = plan.id;
    let extras = { mobile: 0, desktop: 0, businesses: 0 };
    if (licenseId) {
      const lic = await prisma.license.findUnique({ where: { id: licenseId } });
      if (lic) extras = ownedExtras(plan, licenseCaps(lic));
    }
    amount = monthlyTotal(plan, extras);
    description = `${plan.name} subscription (monthly)`;
  }

  const payment = await prisma.payment.create({
    data: {
      customer_id: uid,
      plan_id: planId,
      license_id: licenseId,
      amount,
      transaction_id: transactionId,
      receipt_image: null,
      payment_method: data.payment_method,
      payment_type: data.payment_type,
      quantity: data.quantity,
      description,
      status: "pending",
      admin_notes: "",
      created_at: now,
      updated_at: now,
    },
    include: { plan: true, license: true, customer: true, invoice: true },
  });
  res.status(201).json(serializePaymentDetail(payment as never));
}));

/** Mirrors api_publicSubscriptionStatusView so mobile + web agree. */
customerRouter.get("/subscription/status", wrap(async (req: Request, res: Response) => {
  res.json(await resolveSubscriptionStatus(req.user!.id));
}));

customerRouter.get("/invoices", wrap(async (req: Request, res: Response) => {
  const results = await prisma.invoice.findMany({ where: { customer_id: req.user!.id }, include: { customer: true }, orderBy: { created_at: "desc" } });
  res.json(results.map((invoice) => serializeInvoice(invoice)));
}));

customerRouter.get("/download", wrap(async (_req: Request, res: Response) => {
  const versions = await prisma.appVersion.findMany({
    where: { platform: { in: ["android", "windows"] } },
    orderBy: { created_at: "desc" },
    take: 10,
  });
  const formatVersion = (v: { version: string; created_at: Date; download_url: string; release_notes: string | null }) => ({
    version: v.version,
    release_date: v.created_at.toISOString().slice(0, 10),
    file_size: null,
    download_url: v.download_url,
    release_notes: (v.release_notes || "")
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*]\s+/, "").trim())
      .filter(Boolean),
    system_requirements: [],
  });
  const latest = versions[0] ? formatVersion(versions[0]) : null;
  const history = versions.slice(1).map((v) => {
    const formatted = formatVersion(v);
    return {
      version: formatted.version,
      release_date: formatted.release_date,
      file_size: formatted.file_size,
      highlights: formatted.release_notes.slice(0, 4),
    };
  });
  res.json({ latest, history });
}));

customerRouter.get("/notifications", wrap(async (req: Request, res: Response) => {
  const results = await prisma.notification.findMany({ where: { recipient_id: req.user!.id }, orderBy: { created_at: "desc" } });
  res.json(results);
}));

customerRouter.get("/", wrap(async (req: Request, res: Response) => {
  const results = await prisma.notification.findMany({ where: { recipient_id: req.user!.id }, orderBy: { created_at: "desc" } });
  res.json(results);
}));

export const publicRouter = Router();
publicRouter.get("/plans", wrap(async (_req: Request, res: Response) => {
  const results = await prisma.plan.findMany({ where: { is_active: true }, orderBy: { price: "asc" } });
  res.json(results.map((plan) => serializePlan(plan)));
}));

publicRouter.post("/contacts", wrap(async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1).max(150),
    email: z.string().email(),
    phone: z.string().max(20).optional().default(""),
    subject: z.string().max(255).optional().default("Website contact form"),
    message: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) throw badRequest("Please provide your name, email, subject and message.");
  const data = parsed.data;
  const now = new Date();
  if (envContactStoreEnabled()) {
    await prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject,
        message: data.message,
        status: "new",
        created_at: now,
      },
    });
  }
  res.status(202).json({ detail: "Message received. We will get back to you shortly." });
}));

function envContactStoreEnabled(): boolean {
  return true;
}