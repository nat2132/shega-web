import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { wrap, badRequest, notFound } from "../../lib/errors";
import { getPagination, paginated } from "../../lib/pagination";
import { ordering } from "../../lib/ordering";
import { dateFilter, boolParam } from "../../lib/filters";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { serializeSubscriptionDetail, serializeSubscriptionList } from "../../lib/serializers";
import { logAdminAction } from "../../lib/audit";

export const subscriptionsRouter = Router();

const SUB_ORDERING = ["created_at", "expiry_date", "start_date", "updated_at", "id"] as const;

subscriptionsRouter.use(requireAuth, requireAdmin);

async function loadDetail(id: number) {
  const sub = await prisma.license.findUnique({
    where: { id },
    include: {
      customer: true,
      plan: true,
      payments: { include: { customer: true, plan: true, license: true } },
      audit_logs: { include: { created_by: true, license: true } },
      device_activations: true,
    },
  });
  if (!sub) throw notFound("Subscription not found.");
  return serializeSubscriptionDetail(sub as never);
}

function buildWhere(req: Request): Record<string, unknown> {
  const where: Record<string, unknown> = { ...dateFilter(req) };
  if (req.query.status) where.status = String(req.query.status);
  if (req.query.plan) where.plan_id = Number(req.query.plan);
  const trial = boolParam(req.query.is_trial);
  if (trial !== undefined) where.is_trial = trial;
  const search = String(req.query.search || "").trim();
  if (search) {
    const or: Record<string, unknown>[] = [];
    for (const field of ["email", "username", "phone", "business_name", "first_name", "last_name"]) {
      or.push({ customer: { [field]: { contains: search } } });
    }
    or.push({ license_key: { contains: search } });
    where.OR = or;
  }
  return where;
}

const listInclude = {
  customer: true,
  plan: true,
  device_activations: true,
} as const;

subscriptionsRouter.get(
  "/",
  wrap(async (req: Request, res: Response) => {
    const { page, pageSize } = getPagination(req);
    const orderBy = ordering(req, SUB_ORDERING, { created_at: "desc" });
    const where = buildWhere(req);
    const [total, subs] = await Promise.all([
      prisma.license.count({ where }),
      prisma.license.findMany({ where, include: listInclude, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    res.json(paginated(req, total, subs.map((s) => serializeSubscriptionList(s as never)), page, pageSize));
  }),
);

subscriptionsRouter.get(
  "/:id(\\d+)",
  wrap(async (req: Request, res: Response) => {
    res.json(await loadDetail(Number(req.params.id)));
  }),
);

subscriptionsRouter.post(
  "/:id(\\d+)/activate",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const sub = await prisma.license.findUnique({ where: { id } });
    if (!sub) throw notFound("Subscription not found.");
    if (sub.status === "active") throw badRequest("Subscription is already active.");
    await prisma.license.update({ where: { id }, data: { status: "active", updated_at: new Date() } });
    await logAdminAction(req, {
      action: "activate_subscription",
      resourceType: "subscription",
      resourceId: id,
      details: { license_key: sub.license_key },
    });
    res.json(await loadDetail(id));
  }),
);

subscriptionsRouter.post(
  "/:id(\\d+)/extend",
  wrap(async (req: Request, res: Response) => {
    const schema = z.object({ days: z.coerce.number().int().min(1) });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest("days is required (integer >= 1).");
    const id = Number(req.params.id);
    const sub = await prisma.license.findUnique({ where: { id } });
    if (!sub) throw notFound("Subscription not found.");
    const days = Number(parsed.data.days);
    const base = sub.expiry_date ? new Date(sub.expiry_date) : new Date();
    const newExpiry = new Date(base.getTime() + days * 86400000);
    await prisma.license.update({
      where: { id },
      data: {
        expiry_date: newExpiry,
        status: sub.status === "expired" ? "active" : sub.status,
        updated_at: new Date(),
      },
    });
    await logAdminAction(req, {
      action: "extend_subscription",
      resourceType: "subscription",
      resourceId: id,
      details: { license_key: sub.license_key, days },
    });
    res.json(await loadDetail(id));
  }),
);

subscriptionsRouter.post(
  "/:id(\\d+)/renew",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const sub = await prisma.license.findUnique({ where: { id }, include: { plan: true } });
    if (!sub) throw notFound("Subscription not found.");
    if (!sub.plan) throw badRequest("Subscription has no plan.");
    const now = new Date();
    const duration = sub.plan.duration_months * 30;
    const start = now;
    const expiry = new Date(now.getTime() + duration * 86400000);
    await prisma.license.update({
      where: { id },
      data: { start_date: start, expiry_date: expiry, status: "active", updated_at: now },
    });
    await prisma.licenseAuditLog.create({
      data: {
        license_id: id,
        action: "renewed",
        details: JSON.stringify({ renewed_by: req.user?.id }),
        created_by_id: req.user?.id,
        created_at: now,
      },
    });
    await logAdminAction(req, {
      action: "renew_subscription",
      resourceType: "subscription",
      resourceId: id,
      details: { license_key: sub.license_key },
    });
    res.json(await loadDetail(id));
  }),
);

async function changePlan(req: Request, id: number, direction: "up" | "down") {
  const schema = z.object({ plan_id: z.coerce.number().int().positive() });
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) throw badRequest("plan_id is required.");
  const sub = await prisma.license.findUnique({ where: { id }, include: { plan: true } });
  if (!sub) throw notFound("Subscription not found.");
  if (!sub.plan) throw badRequest("Subscription has no plan.");
  const newPlan = await prisma.plan.findUnique({ where: { id: parsed.data.plan_id } });
  if (!newPlan || !newPlan.is_active) throw badRequest("Invalid or inactive plan.");
  const oldName = sub.plan.name;
  if (direction === "up" && newPlan.price <= sub.plan.price) {
    throw badRequest("New plan must have a higher price for upgrade.");
  }
  if (direction === "down" && newPlan.price >= sub.plan.price) {
    throw badRequest("New plan must have a lower price for downgrade.");
  }
  const updated = await prisma.license.update({
    where: { id },
    data: { plan_id: newPlan.id, updated_at: new Date() },
  });
  await logAdminAction(req, {
    action: direction === "up" ? "upgrade_subscription" : "downgrade_subscription",
    resourceType: "subscription",
    resourceId: id,
    details: { license_key: sub.license_key, from: oldName, to: newPlan.name },
  });
  return updated;
}

subscriptionsRouter.post(
  "/:id(\\d+)/upgrade",
  wrap(async (req: Request, res: Response) => {
    await changePlan(req, Number(req.params.id), "up");
    res.json(await loadDetail(Number(req.params.id)));
  }),
);

subscriptionsRouter.post(
  "/:id(\\d+)/downgrade",
  wrap(async (req: Request, res: Response) => {
    await changePlan(req, Number(req.params.id), "down");
    res.json(await loadDetail(Number(req.params.id)));
  }),
);

subscriptionsRouter.post(
  "/:id(\\d+)/cancel",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const sub = await prisma.license.findUnique({ where: { id } });
    if (!sub) throw notFound("Subscription not found.");
    const reason = String(req.body?.reason ?? "");
    const now = new Date();
    await prisma.license.update({ where: { id }, data: { status: "revoked", updated_at: now } });
    await prisma.licenseAuditLog.create({
      data: {
        license_id: id,
        action: "revoked",
        details: JSON.stringify({ revoked_by: req.user?.id, reason }),
        created_by_id: req.user?.id,
        created_at: now,
      },
    });
    await logAdminAction(req, {
      action: "cancel_subscription",
      resourceType: "subscription",
      resourceId: id,
      details: { license_key: sub.license_key },
    });
    res.json(await loadDetail(id));
  }),
);

subscriptionsRouter.post(
  "/:id(\\d+)/expire",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const sub = await prisma.license.findUnique({ where: { id } });
    if (!sub) throw notFound("Subscription not found.");
    const now = new Date();
    await prisma.license.update({ where: { id }, data: { status: "expired", expiry_date: now, updated_at: now } });
    await prisma.licenseAuditLog.create({
      data: {
        license_id: id,
        action: "expired",
        details: JSON.stringify({ expired_by: req.user?.id }),
        created_by_id: req.user?.id,
        created_at: now,
      },
    });
    await logAdminAction(req, {
      action: "expire_subscription",
      resourceType: "subscription",
      resourceId: id,
      details: { license_key: sub.license_key },
    });
    res.json(await loadDetail(id));
  }),
);

subscriptionsRouter.post(
  "/:id(\\d+)/restore",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const sub = await prisma.license.findUnique({ where: { id } });
    if (!sub) throw notFound("Subscription not found.");
    const now = new Date();
    await prisma.license.update({ where: { id }, data: { status: "active", updated_at: now } });
    await prisma.licenseAuditLog.create({
      data: {
        license_id: id,
        action: "activated",
        details: JSON.stringify({ restored_by: req.user?.id }),
        created_by_id: req.user?.id,
        created_at: now,
      },
    });
    await logAdminAction(req, {
      action: "restore_subscription",
      resourceType: "subscription",
      resourceId: id,
      details: { license_key: sub.license_key },
    });
    res.json(await loadDetail(id));
  }),
);

subscriptionsRouter.post(
  "/:id(\\d+)/notes",
  wrap(async (req: Request, res: Response) => {
    const schema = z.object({ notes: z.string() });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest("notes is required.");
    const id = Number(req.params.id);
    const sub = await prisma.license.findUnique({ where: { id } });
    if (!sub) throw notFound("Subscription not found.");
    await prisma.license.update({ where: { id }, data: { notes: parsed.data.notes, updated_at: new Date() } });
    await logAdminAction(req, {
      action: "update_subscription_notes",
      resourceType: "subscription",
      resourceId: id,
      details: { license_key: sub.license_key },
    });
    res.json(await loadDetail(id));
  }),
);