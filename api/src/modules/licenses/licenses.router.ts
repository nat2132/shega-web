import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { wrap, badRequest, notFound } from "../../lib/errors";
import { getPagination, paginated } from "../../lib/pagination";
import { ordering } from "../../lib/ordering";
import { dateFilter, boolParam } from "../../lib/filters";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { serializeDeviceActivation, serializeLicense } from "../../lib/serializers";
import { logAdminAction } from "../../lib/audit";

export const licensesRouter = Router();

const DEVICE_ORDERING = ["activation_date", "last_seen", "id"] as const;

licensesRouter.use(requireAuth, requireAdmin);

licensesRouter.get(
  "/device-activations",
  wrap(async (req: Request, res: Response) => {
    const where: Record<string, unknown> = { ...dateFilter(req) };
    if (req.query.license) where.license_id = Number(req.query.license);
    const active = boolParam(req.query.is_active);
    if (active !== undefined) where.is_active = active;
    if (req.query.operating_system) where.operating_system = String(req.query.operating_system);
    const search = String(req.query.search || "").trim();
    if (search) {
      const or: Record<string, unknown>[] = [
        { device_id: { contains: search } },
        { device_name: { contains: search } },
      ];
      if (/^ERP-/.test(search)) or.push({ license: { license_key: { contains: search } } });
      where.OR = or;
    }
    const { page, pageSize } = getPagination(req);
    const orderBy = ordering(req, DEVICE_ORDERING, { activation_date: "desc" });
    const [total, devices] = await Promise.all([
      prisma.deviceActivation.count({ where }),
      prisma.deviceActivation.findMany({
        where,
        include: { license: true },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    res.json(
      paginated(req, total, devices.map((d) => serializeDeviceActivation(d)), page, pageSize),
    );
  }),
);

async function loadLicense(id: number) {
  const license = await prisma.license.findUnique({
    where: { id },
    include: { customer: true, plan: true },
  });
  if (!license) throw notFound("License not found.");
  return serializeLicense(license);
}

licensesRouter.post(
  "/licenses/:id(\\d+)/suspend",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const license = await prisma.license.findUnique({ where: { id } });
    if (!license) throw notFound("License not found.");
    if (license.status !== "active") throw badRequest("Only active licenses can be suspended.");
    const now = new Date();
    await prisma.license.update({ where: { id }, data: { status: "suspended", updated_at: now } });
    await prisma.licenseAuditLog.create({
      data: {
        license_id: id,
        action: "suspended",
        details: JSON.stringify({ suspended_by: req.user?.id, reason: String(req.body?.reason ?? "") }),
        created_by_id: req.user?.id,
        created_at: now,
      },
    });
    await logAdminAction(req, {
      action: "suspend_subscription",
      resourceType: "subscription",
      resourceId: id,
      details: { license_key: license.license_key },
    });
    res.json(await loadLicense(id));
  }),
);

licensesRouter.post(
  "/licenses/:id(\\d+)/deactivate_device",
  wrap(async (req: Request, res: Response) => {
    const schema = z.object({ device_id: z.string().min(1) });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest("device_id is required.");
    const id = Number(req.params.id);
    const license = await prisma.license.findUnique({ where: { id } });
    if (!license) throw notFound("License not found.");
    const device = await prisma.deviceActivation.findFirst({
      where: { license_id: id, device_id: parsed.data.device_id, is_active: true },
    });
    if (!device) throw notFound("Active device activation not found.");
    await prisma.deviceActivation.update({
      where: { id: device.id },
      data: { is_active: false },
    });
    await prisma.licenseAuditLog.create({
      data: {
        license_id: id,
        action: "deactivated",
        details: JSON.stringify({ device_id: device.device_id, device_name: device.device_name }),
        ip_address: device.ip_address || null,
        created_by_id: req.user?.id,
        created_at: new Date(),
      },
    });
    const updated = await prisma.deviceActivation.findUnique({
      where: { id: device.id },
      include: { license: true },
    });
    res.json(serializeDeviceActivation(updated!));
  }),
);