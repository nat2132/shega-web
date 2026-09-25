import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { wrap, badRequest, notFound } from "../../lib/errors";
import { getPagination, paginated } from "../../lib/pagination";
import { ordering } from "../../lib/ordering";
import { boolParam, dateFilter } from "../../lib/filters";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { serializePlan } from "../../lib/serializers";
import { logAdminAction } from "../../lib/audit";

export const plansRouter = Router();

const PLAN_ORDERING = ["price", "duration_months", "created_at", "name", "id"] as const;

export const PLAN_EDITIONS = ["mobile", "desktop", "both"] as const;
export type PlanEdition = (typeof PLAN_EDITIONS)[number];

plansRouter.use(requireAuth, requireAdmin);

// The canonical plan shape: an edition (which platforms the plan unlocks),
// a monthly price, and the device/business allocations included. Everything
// except `name`, `duration_months` and `price` is optional so legacy-shaped
// payloads still validate.
const planSchema = z.object({
  name: z.string().min(1),
  duration_months: z.coerce.number().int().min(1),
  device_limit: z.coerce.number().int().min(0).default(1),
  price: z.coerce.number().nonnegative(),
  is_active: z.boolean().optional().default(true),
  edition: z.enum(PLAN_EDITIONS).optional(),
  included_mobile_devices: z.coerce.number().int().min(0).optional(),
  included_desktop_devices: z.coerce.number().int().min(0).optional(),
  included_businesses: z.coerce.number().int().min(0).optional(),
  addon_mobile_price: z.coerce.number().nonnegative().optional(),
  addon_desktop_price: z.coerce.number().nonnegative().optional(),
  addon_business_price: z.coerce.number().nonnegative().optional(),
});

/** Plan-management payload → Prisma data (drops undefined so PATCH is partial). */
function planData(data: z.infer<typeof planSchema>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

plansRouter.get(
  "/",
  wrap(async (req: Request, res: Response) => {
    const where: Record<string, unknown> = { ...dateFilter(req) };
    const active = boolParam(req.query.is_active);
    if (active !== undefined) where.is_active = active;
    if (req.query.search) {
      where.name = { contains: String(req.query.search) };
    }
    const { page, pageSize } = getPagination(req);
    const orderBy = ordering(req, PLAN_ORDERING, { price: "asc" });
    const [total, plans] = await Promise.all([
      prisma.plan.count({ where }),
      prisma.plan.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    res.json(paginated(req, total, plans.map((p) => serializePlan(p)), page, pageSize));
  }),
);

plansRouter.post(
  "/",
  wrap(async (req: Request, res: Response) => {
    const parsed = planSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      res.status(400).json({ [String(issue?.path[0] ?? "detail")]: [issue?.message ?? "Invalid value."] });
      return;
    }
    const data = parsed.data;
    const plan = await prisma.plan.create({
      data: {
        ...planData(data),
        name: data.name,
        duration_months: data.duration_months,
        device_limit: data.device_limit,
        price: data.price,
        is_active: data.is_active,
        created_at: new Date(),
      } as never,
    });
    await logAdminAction(req, {
      action: "create_plan",
      resourceType: "plan",
      resourceId: plan.id,
      details: { name: plan.name },
    });
    res.status(201).json(serializePlan(plan));
  }),
);

plansRouter.get(
  "/:id(\\d+)",
  wrap(async (req: Request, res: Response) => {
    const plan = await prisma.plan.findUnique({ where: { id: Number(req.params.id) } });
    if (!plan) throw notFound("Plan not found.");
    res.json(serializePlan(plan));
  }),
);

plansRouter.patch(
  "/:id(\\d+)",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) throw notFound("Plan not found.");
    const parsed = planSchema.partial().safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ detail: "Invalid plan data." });
      return;
    }
    const { is_active, price, device_limit, ...rest } = parsed.data;
    const data: Record<string, unknown> = { ...planData(rest as z.infer<typeof planSchema>), updated_at: new Date() };
    if (price !== undefined) data.price = price;
    if (device_limit !== undefined) data.device_limit = device_limit;
    if (is_active !== undefined) data.is_active = is_active;
    const plan = await prisma.plan.update({ where: { id }, data: data as never });
    await logAdminAction(req, {
      action: "update_plan",
      resourceType: "plan",
      resourceId: id,
      details: { name: plan.name },
      beforeState: { ...existing } as never,
      afterState: { ...plan } as never,
    });
    res.json(serializePlan(plan));
  }),
);

plansRouter.delete(
  "/:id(\\d+)",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      await prisma.plan.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw badRequest("Cannot delete a plan that is referenced by licenses.");
      }
      throw err;
    }
    await logAdminAction(req, {
      action: "delete_plan",
      resourceType: "plan",
      resourceId: id,
    });
    res.status(204).send();
  }),
);