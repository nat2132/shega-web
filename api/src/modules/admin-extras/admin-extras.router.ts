import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { requireAdmin, requireAuth } from "../../middleware/auth";
import { getPagination, paginated } from "../../lib/pagination";
import { wrap, notFound } from "../../lib/errors";

export const adminExtrasRouter = Router();
adminExtrasRouter.use(requireAuth, requireAdmin);

adminExtrasRouter.get("/feature-flags", wrap(async (req: Request, res: Response) => {
  const { page, pageSize } = getPagination(req);
  const [count, results] = await Promise.all([
    prisma.featureFlag.count(),
    prisma.featureFlag.findMany({ orderBy: { id: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  res.json(paginated(req, count, results, page, pageSize));
}));

adminExtrasRouter.post("/feature-flags", wrap(async (req: Request, res: Response) => {
  const data = z.object({ name: z.string().min(1), code: z.string().min(1), enabled: z.boolean().optional(), is_beta: z.boolean().optional(), description: z.string().optional() }).parse(req.body);
  const result = await prisma.featureFlag.create({ data: { ...data, enabled: data.enabled ?? false, is_beta: data.is_beta ?? false, description: data.description ?? "", created_at: new Date(), updated_at: new Date() } });
  res.status(201).json(result);
}));

adminExtrasRouter.post("/feature-flags/:id(\\d+)/toggle", wrap(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const current = await prisma.featureFlag.findUnique({ where: { id } });
  if (!current) throw notFound("Feature flag not found.");
  res.json(await prisma.featureFlag.update({ where: { id }, data: { enabled: !current.enabled, updated_at: new Date() } }));
}));

adminExtrasRouter.get("/support-tickets", wrap(async (req: Request, res: Response) => {
  const { page, pageSize } = getPagination(req);
  const [count, results] = await Promise.all([
    prisma.supportTicket.count(),
    prisma.supportTicket.findMany({ include: { business: true, assigned_to: true, replies: { orderBy: { created_at: "asc" } } }, orderBy: { updated_at: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  res.json(paginated(req, count, results, page, pageSize));
}));

adminExtrasRouter.post("/support-tickets/:id(\\d+)/reply", wrap(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = z.object({ message: z.string().min(1), is_internal: z.boolean().optional() }).parse(req.body);
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) throw notFound("Support ticket not found.");
  const reply = await prisma.supportReply.create({ data: { ticket_id: id, admin_id: req.user!.id, message: data.message, is_internal: data.is_internal ?? false, created_at: new Date() } });
  await prisma.supportTicket.update({ where: { id }, data: { updated_at: new Date() } });
  res.status(201).json(reply);
}));

adminExtrasRouter.post("/support-tickets/:id(\\d+)/close", wrap(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  res.json(await prisma.supportTicket.update({ where: { id }, data: { status: "closed", updated_at: new Date() } }));
}));

adminExtrasRouter.post("/support-tickets/:id(\\d+)/assign", wrap(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const adminId = z.coerce.number().int().positive().parse(req.body?.admin_id);
  res.json(await prisma.supportTicket.update({ where: { id }, data: { assigned_to_id: adminId, updated_at: new Date() } }));
}));

adminExtrasRouter.post("/support-tickets/:id(\\d+)/escalate", wrap(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  res.json(await prisma.supportTicket.update({ where: { id }, data: { priority: "high", updated_at: new Date() } }));
}));

adminExtrasRouter.post("/admins/:id(\\d+)/suspend", wrap(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  res.json(await prisma.user.update({ where: { id }, data: { is_active: false, updated_at: new Date() } }));
}));

adminExtrasRouter.post("/admins/:id(\\d+)/reset-password", wrap(async (_req: Request, res: Response) => {
  res.status(202).json({ detail: "Password reset workflow queued." });
}));

adminExtrasRouter.post("/notifications/send", wrap(async (req: Request, res: Response) => {
  const data = z.object({ recipient_id: z.number().int().positive(), title: z.string().min(1), message: z.string().min(1), notification_type: z.string().default("admin"), link: z.string().optional() }).parse(req.body);
  const result = await prisma.notification.create({ data: { ...data, link: data.link ?? "", created_at: new Date() } });
  res.status(201).json(result);
}));

adminExtrasRouter.get("/revenue", wrap(async (_req: Request, res: Response) => {
  const result = await prisma.payment.aggregate({ where: { status: "approved" }, _sum: { amount: true }, _count: { id: true } });
  res.json({ total_revenue: Number(result._sum.amount ?? 0), payment_count: result._count.id });
}));

adminExtrasRouter.get("/analytics/overview", wrap(async (_req: Request, res: Response) => {
  const [customers, activeLicenses, payments, pendingPayments] = await Promise.all([
    prisma.user.count({ where: { is_customer: true } }),
    prisma.license.count({ where: { status: "active" } }),
    prisma.payment.count({ where: { status: "approved" } }),
    prisma.payment.count({ where: { status: "pending" } }),
  ]);
  res.json({ customers, active_licenses: activeLicenses, approved_payments: payments, pending_payments: pendingPayments });
}));