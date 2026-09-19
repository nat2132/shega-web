import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { wrap, badRequest, forbidden, notFound } from "../../lib/errors";
import { getPagination, paginated } from "../../lib/pagination";
import { ordering } from "../../lib/ordering";
import { dateFilter } from "../../lib/filters";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { serializeSubscriptionDetail, serializeSubscriptionList } from "../../lib/serializers";
import { logAdminAction } from "../../lib/audit";

export const trialsRouter = Router();

const TRIAL_ORDERING = ["created_at", "expiry_date", "start_date", "updated_at", "id"] as const;

trialsRouter.use(requireAuth, requireAdmin);

function buildWhere(req: Request): Record<string, unknown> {
  const where: Record<string, unknown> = { is_trial: true, ...dateFilter(req) };
  if (req.query.status) where.status = String(req.query.status);
  const search = String(req.query.search || "").trim();
  if (search) {
    const or: Record<string, unknown>[] = [
      { license_key: { contains: search } },
      { customer: { username: { contains: search } } },
    ];
    for (const field of ["email", "username", "phone", "business_name"]) {
      or.push({ customer: { [field]: { contains: search } } });
    }
    where.OR = or;
  }
  return where;
}

const listInclude = {
  customer: true,
  plan: true,
  device_activations: true,
} as const;

const detailInclude = {
  customer: true,
  plan: true,
  payments: { include: { customer: true, plan: true, license: true } },
  audit_logs: { include: { created_by: true, license: true } },
  device_activations: true,
} as const;

async function loadDetail(id: number) {
  const trial = await prisma.license.findUnique({ where: { id }, include: detailInclude });
  if (!trial) throw notFound("Trial not found.");
  return serializeSubscriptionDetail(trial as never);
}

trialsRouter.get(
  "/",
  wrap(async (req: Request, res: Response) => {
    const { page, pageSize } = getPagination(req);
    const orderBy = ordering(req, TRIAL_ORDERING, { created_at: "desc" });
    const where = buildWhere(req);
    const [total, trials] = await Promise.all([
      prisma.license.count({ where }),
      prisma.license.findMany({ where, include: listInclude, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    res.json(paginated(req, total, trials.map((t) => serializeSubscriptionList(t as never)), page, pageSize));
  }),
);

trialsRouter.get(
  "/:id(\\d+)",
  wrap(async (req: Request, res: Response) => {
    res.json(await loadDetail(Number(req.params.id)));
  }),
);

trialsRouter.post(
  "/:id(\\d+)/extend",
  wrap(async (req: Request, res: Response) => {
    const schema = z.object({ days: z.coerce.number().int().min(1) });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest("days is required (integer >= 1).");
    const id = Number(req.params.id);
    const trial = await prisma.license.findUnique({ where: { id } });
    if (!trial) throw notFound("Trial not found.");
    const days = Number(parsed.data.days);
    const base = trial.expiry_date ? new Date(trial.expiry_date) : new Date();
    const newExpiry = new Date(base.getTime() + days * 86400000);
    await prisma.license.update({
      where: { id },
      data: {
        expiry_date: newExpiry,
        status: trial.status === "expired" ? "active" : trial.status,
        updated_at: new Date(),
      },
    });
    await logAdminAction(req, {
      action: "extend_trial",
      resourceType: "trial",
      resourceId: id,
      details: { license_key: trial.license_key, days },
    });
    res.json(await loadDetail(id));
  }),
);

trialsRouter.post(
  "/:id(\\d+)/end",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const trial = await prisma.license.findUnique({ where: { id } });
    if (!trial) throw notFound("Trial not found.");
    await prisma.license.update({
      where: { id },
      data: { expiry_date: new Date(), status: "expired", updated_at: new Date() },
    });
    await logAdminAction(req, {
      action: "end_trial",
      resourceType: "trial",
      resourceId: id,
      details: { license_key: trial.license_key },
    });
    res.json({ detail: "Trial ended successfully." });
  }),
);

trialsRouter.post(
  "/:id(\\d+)/convert",
  wrap(async (req: Request, res: Response) => {
    const schema = z.object({ plan_id: z.coerce.number().int().positive() });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest("plan_id is required.");
    const id = Number(req.params.id);
    const trial = await prisma.license.findUnique({ where: { id }, include: { plan: true } });
    if (!trial) throw notFound("Trial not found.");
    const newPlan = await prisma.plan.findUnique({ where: { id: parsed.data.plan_id } });
    if (!newPlan || !newPlan.is_active) throw badRequest("Invalid or inactive plan.");
    const oldPlanName = trial.plan?.name ?? null;
    const now = new Date();
    const expiry = new Date(now.getTime() + newPlan.duration_months * 30 * 86400000);
    await prisma.license.update({
      where: { id },
      data: {
        plan_id: newPlan.id,
        is_trial: false,
        status: "active",
        start_date: now,
        expiry_date: expiry,
        updated_at: now,
      },
    });
    await prisma.licenseAuditLog.create({
      data: {
        license_id: id,
        action: "renewed",
        details: JSON.stringify({
          converted_from_trial: true,
          from_plan: oldPlanName,
          to_plan: newPlan.name,
        }),
        created_by_id: req.user?.id,
        created_at: now,
      },
    });
    await logAdminAction(req, {
      action: "convert_trial",
      resourceType: "trial",
      resourceId: id,
      details: { license_key: trial.license_key, to_plan: newPlan.name },
    });
    res.json(await loadDetail(id));
  }),
);

trialsRouter.post(
  "/:id(\\d+)/reset",
  wrap(async (req: Request, res: Response) => {
    if (!req.user?.is_superuser) throw forbidden("Only super admins can reset trials.");
    const id = Number(req.params.id);
    const trial = await prisma.license.findUnique({ where: { id } });
    if (!trial) throw notFound("Trial not found.");
    const now = new Date();
    await prisma.license.update({
      where: { id },
      data: {
        start_date: now,
        expiry_date: new Date(now.getTime() + 30 * 86400000),
        status: "active",
        updated_at: now,
      },
    });
    await logAdminAction(req, {
      action: "reset_trial",
      resourceType: "trial",
      resourceId: id,
      details: { license_key: trial.license_key },
    });
    res.json({ detail: "Trial reset successfully." });
  }),
);