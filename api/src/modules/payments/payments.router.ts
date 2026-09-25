import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { wrap, badRequest, notFound } from "../../lib/errors";
import { getPagination, paginated } from "../../lib/pagination";
import { ordering } from "../../lib/ordering";
import { dateFilter } from "../../lib/filters";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { serializePaymentDetail, serializePaymentList } from "../../lib/serializers";
import { logAdminAction } from "../../lib/audit";
import { processApprovedPayment } from "./payments.service";

export const paymentsRouter = Router();

const PAYMENT_ORDERING = ["created_at", "amount", "reviewed_at", "id"] as const;

paymentsRouter.use(requireAuth, requireAdmin);

function buildWhere(req: Request): Record<string, unknown> {
  const where: Record<string, unknown> = { ...dateFilter(req) };
  if (req.query.status) where.status = String(req.query.status);
  if (req.query.payment_method) where.payment_method = String(req.query.payment_method);
  const search = String(req.query.search || "").trim();
  if (search) {
    const or: Record<string, unknown>[] = [];
    for (const field of ["email", "username", "phone", "business_name"]) {
      or.push({ customer: { [field]: { contains: search } } });
    }
    or.push({ transaction_id: { contains: search } });
    where.OR = or;
  }
  return where;
}

const detailInclude = {
  customer: true,
  plan: true,
  license: true,
  invoice: { include: { customer: true } },
} as const;

async function loadDetail(id: number) {
  const pmt = await prisma.payment.findUnique({ where: { id }, include: detailInclude });
  if (!pmt) throw notFound("Payment not found.");
  return serializePaymentDetail(pmt as never);
}

paymentsRouter.get(
  "/",
  wrap(async (req: Request, res: Response) => {
    const { page, pageSize } = getPagination(req);
    const orderBy = ordering(req, PAYMENT_ORDERING, { created_at: "desc" });
    const where = buildWhere(req);
    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: { customer: true, plan: true, license: true },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    res.json(paginated(req, total, payments.map((p) => serializePaymentList(p as never)), page, pageSize));
  }),
);

paymentsRouter.get(
  "/:id(\\d+)",
  wrap(async (req: Request, res: Response) => {
    res.json(await loadDetail(Number(req.params.id)));
  }),
);

paymentsRouter.post(
  "/:id(\\d+)/approve",
  wrap(async (req: Request, res: Response) => {
    const schema = z.object({ admin_notes: z.string().optional().default("") });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest("Invalid data.");
    const id = Number(req.params.id);
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) throw notFound("Payment not found.");
    if (payment.status !== "pending") throw badRequest("Only pending payments can be approved.");
    const now = new Date();
    const adminNotes = parsed.data.admin_notes ?? "";
    await prisma.payment.update({
      where: { id },
      data: {
        status: "approved",
        admin_notes: adminNotes,
        reviewed_by_id: req.user!.id,
        reviewed_at: now,
        updated_at: now,
      },
    });
    await processApprovedPayment(id);
    await prisma.notification.create({
      data: {
        recipient_id: payment.customer_id,
        notification_type: "payment_approved",
        title: "Payment Approved",
        message: `Your payment of ${payment.amount} has been approved.`,
        created_at: now,
      },
    });
    await logAdminAction(req, {
      action: "approve_payment",
      resourceType: "payment",
      resourceId: id,
      details: { transaction_id: payment.transaction_id, amount: String(payment.amount) },
    });
    res.json(await loadDetail(id));
  }),
);

paymentsRouter.post(
  "/:id(\\d+)/reject",
  wrap(async (req: Request, res: Response) => {
    const schema = z.object({ reason: z.string().min(1) });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest("reason is required.");
    const id = Number(req.params.id);
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) throw notFound("Payment not found.");
    if (payment.status !== "pending") throw badRequest("Only pending payments can be rejected.");
    const now = new Date();
    await prisma.payment.update({
      where: { id },
      data: {
        status: "rejected",
        admin_notes: parsed.data.reason,
        reviewed_by_id: req.user!.id,
        reviewed_at: now,
        updated_at: now,
      },
    });
    await prisma.notification.create({
      data: {
        recipient_id: payment.customer_id,
        notification_type: "payment_rejected",
        title: "Payment Rejected",
        message: `Your payment has been rejected. Reason: ${parsed.data.reason}`,
        created_at: now,
      },
    });
    await logAdminAction(req, {
      action: "reject_payment",
      resourceType: "payment",
      resourceId: id,
      details: { transaction_id: payment.transaction_id, reason: parsed.data.reason },
    });
    res.json(await loadDetail(id));
  }),
);

paymentsRouter.post(
  "/:id(\\d+)/request_info",
  wrap(async (req: Request, res: Response) => {
    const schema = z.object({ message: z.string().min(1) });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest("message is required.");
    const id = Number(req.params.id);
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) throw notFound("Payment not found.");
    await prisma.notification.create({
      data: {
        recipient_id: payment.customer_id,
        notification_type: "system",
        title: "Additional Information Required",
        message: parsed.data.message,
        created_at: new Date(),
      },
    });
    await logAdminAction(req, {
      action: "request_payment_info",
      resourceType: "payment",
      resourceId: id,
      details: { transaction_id: payment.transaction_id, message: parsed.data.message },
    });
    res.json({ detail: "Information request sent to customer." });
  }),
);

paymentsRouter.post(
  "/:id(\\d+)/request-info",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const message = z.string().min(1).parse(req.body?.message);
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      throw notFound("Payment not found.");
    }
    const updated = await prisma.payment.update({
      where: { id },
      data: { admin_notes: message, status: "pending", updated_at: new Date() },
    });
    res.json(serializePaymentDetail(updated));
  }),
);

paymentsRouter.get(
  "/search",
  wrap(async (req: Request, res: Response) => {
    const q = String(req.query.q || "").trim();
    if (!q) {
      res.json({ results: [] });
      return;
    }
    const or: Record<string, unknown>[] = [];
    for (const field of ["email", "username", "phone"]) {
      or.push({ customer: { [field]: { contains: q } } });
    }
    or.push({ transaction_id: { contains: q } });
    const payments = await prisma.payment.findMany({
      where: { OR: or },
      include: { customer: true, plan: true, license: true },
      take: 50,
      orderBy: { created_at: "desc" },
    });
    res.json({ results: payments.map((p) => serializePaymentList(p as never)) });
  }),
);