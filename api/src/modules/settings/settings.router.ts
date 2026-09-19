import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { wrap, badRequest } from "../../lib/errors";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { logAdminAction } from "../../lib/audit";

export const settingsRouter = Router();

settingsRouter.use(requireAuth, requireAdmin);

async function serializeSettings() {
  const rows = await prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
  return rows.map((s) => ({
    key: s.key,
    value: s.value ?? "",
    type: s.type ?? "string",
    description: s.description ?? undefined,
  }));
}

settingsRouter.get(
  "/",
  wrap(async (_req: Request, res: Response) => {
    res.json({ settings: await serializeSettings() });
  }),
);

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.string().optional().default(""),
  type: z.string().optional().default("string"),
  description: z.string().optional(),
});

settingsRouter.put(
  "/",
  wrap(async (req: Request, res: Response) => {
    const parsed = settingSchema.array().safeParse(req.body ?? []);
    if (!parsed.success) throw badRequest("Body must be an array of {key, value, type}.");
    const now = new Date();
    for (const item of parsed.data) {
      const existing = await prisma.systemSetting.findUnique({ where: { key: item.key } });
      if (existing) {
        await prisma.systemSetting.update({
          where: { key: item.key },
          data: {
            value: item.value,
            type: item.type,
            description: item.description,
            updated_at: now,
          },
        });
      } else {
        await prisma.systemSetting.create({
          data: {
            key: item.key,
            value: item.value,
            type: item.type,
            description: item.description,
            created_at: now,
            updated_at: now,
          },
        });
      }
    }
    await logAdminAction(req, {
      action: "update_settings",
      resourceType: "system",
      details: { keys: parsed.data.map((s) => s.key) },
    });
    res.json({ settings: await serializeSettings() });
  }),
);