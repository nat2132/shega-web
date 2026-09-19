import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { wrap, badRequest, notFound } from "../../lib/errors";
import { getPagination, paginated } from "../../lib/pagination";
import { ordering } from "../../lib/ordering";
import { boolParam } from "../../lib/filters";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { serializeAppVersion } from "../../lib/serializers";
import { logAdminAction } from "../../lib/audit";

export const appVersionsRouter = Router();

const VERSION_ORDERING = ["created_at", "version", "id"] as const;

appVersionsRouter.use(requireAuth, requireAdmin);

const versionSchema = z.object({
  platform: z.enum(["android", "ios", "windows", "web"]),
  version: z.string().min(1),
  min_version: z.string().optional().default(""),
  is_force_update: z.boolean().optional().default(false),
  release_notes: z.string().optional().default(""),
  download_url: z.string().optional().default(""),
});

appVersionsRouter.get(
  "/",
  wrap(async (req: Request, res: Response) => {
    const where: Record<string, unknown> = {};
    if (req.query.platform) where.platform = String(req.query.platform);
    const force = boolParam(req.query.is_force_update);
    if (force !== undefined) where.is_force_update = force;
    const search = String(req.query.search || "").trim();
    if (search) {
      where.OR = [
        { version: { contains: search } },
        { platform: { contains: search } },
        { release_notes: { contains: search } },
      ];
    }
    const { page, pageSize } = getPagination(req);
    const orderBy = ordering(req, VERSION_ORDERING, { created_at: "desc" });
    const [total, versions] = await Promise.all([
      prisma.appVersion.count({ where }),
      prisma.appVersion.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    res.json(paginated(req, total, versions.map((v) => serializeAppVersion(v)), page, pageSize));
  }),
);

appVersionsRouter.post(
  "/",
  wrap(async (req: Request, res: Response) => {
    const parsed = versionSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest("Invalid version data.");
    const data = parsed.data;
    const existing = await prisma.appVersion.findUnique({
      where: { platform_version: { platform: data.platform, version: data.version } },
    });
    if (existing) throw badRequest("A version with this platform and version already exists.");
    const version = await prisma.appVersion.create({
      data: {
        platform: data.platform,
        version: data.version,
        min_version: data.min_version,
        is_force_update: data.is_force_update,
        release_notes: data.release_notes,
        download_url: data.download_url,
        created_at: new Date(),
      },
    });
    await logAdminAction(req, {
      action: "create_app_version",
      resourceType: "app_version",
      resourceId: version.id,
      details: { platform: version.platform, version: version.version },
    });
    res.status(201).json(serializeAppVersion(version));
  }),
);

async function loadVersion(id: number) {
  const version = await prisma.appVersion.findUnique({ where: { id } });
  if (!version) throw notFound("App version not found.");
  return version;
}

appVersionsRouter.get(
  "/:id(\\d+)",
  wrap(async (req: Request, res: Response) => {
    res.json(serializeAppVersion(await loadVersion(Number(req.params.id))));
  }),
);

appVersionsRouter.patch(
  "/:id(\\d+)",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existing = await loadVersion(id);
    const parsed = versionSchema.partial().safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest("Invalid version data.");
    const data = parsed.data;
    if (data.platform && data.version) {
      const clash = await prisma.appVersion.findFirst({
        where: { platform: data.platform, version: data.version, NOT: { id } },
      });
      if (clash) throw badRequest("A version with this platform and version already exists.");
    }
    const version = await prisma.appVersion.update({
      where: { id },
      data: {
        ...(data.platform !== undefined && { platform: data.platform }),
        ...(data.version !== undefined && { version: data.version }),
        ...(data.min_version !== undefined && { min_version: data.min_version }),
        ...(data.is_force_update !== undefined && { is_force_update: data.is_force_update }),
        ...(data.release_notes !== undefined && { release_notes: data.release_notes }),
        ...(data.download_url !== undefined && { download_url: data.download_url }),
      },
    });
    await logAdminAction(req, {
      action: "update_app_version",
      resourceType: "app_version",
      resourceId: id,
      details: { platform: version.platform, version: version.version },
      beforeState: { ...existing } as never,
      afterState: { ...version } as never,
    });
    res.json(serializeAppVersion(version));
  }),
);

appVersionsRouter.post(
  "/:id(\\d+)/notify",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const version = await loadVersion(id);
    const message =
      String(req.body?.message ?? "").trim() ||
      `New version v${version.version} available for ${version.platform}.`;
    const recipients = await prisma.user.findMany({ where: { is_customer: true } });
    const now = new Date();
    await prisma.notification.createMany({
      data: recipients.map((r) => ({
        recipient_id: r.id,
        notification_type: "app_update",
        title: `Update Available: v${version.version}`,
        message,
        link: version.download_url,
        created_at: now,
      })),
    });
    await logAdminAction(req, {
      action: "notify_app_version",
      resourceType: "app_version",
      resourceId: id,
      details: { platform: version.platform, version: version.version },
    });
    res.json({ detail: `Notification sent to ${recipients.length} customers.` });
  }),
);

appVersionsRouter.delete(
  "/:id(\\d+)",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await loadVersion(id);
    try {
      await prisma.appVersion.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw badRequest("Version cannot be deleted.");
      }
      throw err;
    }
    await logAdminAction(req, {
      action: "delete_app_version",
      resourceType: "app_version",
      resourceId: id,
    });
    res.status(204).send();
  }),
);