import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { wrap, badRequest, notFound, forbidden } from "../../lib/errors";
import { getPagination, paginated } from "../../lib/pagination";
import { ordering } from "../../lib/ordering";
import { boolParam } from "../../lib/filters";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { serializeUser } from "../../lib/serializers";
import { logAdminAction } from "../../lib/audit";
import { hashPassword } from "../../lib/password";

export const adminsRouter = Router();

adminsRouter.use(requireAuth, requireAdmin);

function serializeAdminList(u: { [k: string]: unknown }): Record<string, unknown> {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    phone: u.phone,
    first_name: u.first_name,
    last_name: u.last_name,
    is_active: u.is_active,
    is_admin: u.is_admin,
    is_superuser: u.is_superuser,
    date_joined: u.date_joined,
    last_login: u.last_login,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

function serializeAdminDetail(u: Record<string, unknown>): Record<string, unknown> {
  const exclude = new Set(["password", "refresh_tokens"]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(u)) {
    if (exclude.has(k)) continue;
    if (k.endsWith("_id") && k !== "admin_id" && k !== "invited_by_id") continue;
    if (v instanceof Date) out[k] = v.toISOString();
    else out[k] = v;
  }
  return out;
}

adminsRouter.get(
  "/",
  wrap(async (req: Request, res: Response) => {
    const where: Record<string, unknown> = { is_admin: true };
    if (req.query.is_active !== undefined) where.is_active = boolParam(req.query.is_active);
    if (req.query.is_superuser !== undefined) where.is_superuser = boolParam(req.query.is_superuser);
    const search = String(req.query.search || "").trim();
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
        { first_name: { contains: search } },
        { last_name: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    const { page, pageSize } = getPagination(req);
    const orderBy = ordering(req, ["date_joined", "last_login", "id"], { date_joined: "desc" });
    const [total, admins] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    res.json(paginated(req, total, admins.map((a) => serializeAdminList(a)), page, pageSize));
  }),
);

const createSchema = z
  .object({
    username: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    password2: z.string().min(8),
    phone: z.string().optional().nullable(),
    first_name: z.string().optional().default(""),
    last_name: z.string().optional().default(""),
    is_admin: z.boolean().optional().default(false),
    is_superuser: z.boolean().optional().default(false),
  })
  .refine((d) => d.password === d.password2, { message: "Passwords do not match.", path: ["password2"] });

adminsRouter.post(
  "/",
  wrap(async (req: Request, res: Response) => {
    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const key = String(issue.path[0] ?? "detail");
      res.status(400).json({ [key]: [issue.message] });
      return;
    }
    const { password2: _, ...data } = parsed.data;
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    });
    if (existing) throw badRequest("A user with this email or username already exists.");
    const now = new Date();
    const user = await prisma.user.create({
      data: {
        ...data,
        phone: data.phone || null,
        address: "",
        notes: "",
        is_staff: true,
        is_active: true,
        password: await hashPassword(data.password),
        date_joined: now,
        created_at: now,
        updated_at: now,
      },
    });
    await logAdminAction(req, {
      action: "create_admin",
      resourceType: "admin",
      resourceId: user.id,
      details: { username: user.username, email: user.email },
    });
    res.status(201).json(serializeAdminList(user));
  }),
);

adminsRouter.get(
  "/:id(\\d+)",
  wrap(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user || !user.is_admin) throw notFound("Admin not found.");
    res.json(serializeAdminDetail(user));
  }),
);

const updateSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  is_active: z.boolean().optional(),
  is_admin: z.boolean().optional(),
  is_superuser: z.boolean().optional(),
});

adminsRouter.patch(
  "/:id(\\d+)",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.is_admin) throw notFound("Admin not found.");
    if (id === req.user!.id && req.body.is_admin === false) {
      throw badRequest("You cannot revoke your own admin status.");
    }
    const parsed = updateSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest("Invalid fields.");
    const data = parsed.data;
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.first_name !== undefined && { first_name: data.first_name }),
        ...(data.last_name !== undefined && { last_name: data.last_name }),
        ...(data.is_active !== undefined && { is_active: data.is_active }),
        ...(data.is_admin !== undefined && { is_admin: data.is_admin }),
        ...(data.is_superuser !== undefined && { is_superuser: data.is_superuser }),
        updated_at: new Date(),
      },
    });
    await logAdminAction(req, {
      action: "update_admin",
      resourceType: "admin",
      resourceId: id,
      beforeState: { is_active: user.is_active, is_admin: user.is_admin, is_superuser: user.is_superuser },
      afterState: { is_active: updated.is_active, is_admin: updated.is_admin, is_superuser: updated.is_superuser },
    });
    res.json(serializeAdminList(updated));
  }),
);

adminsRouter.delete(
  "/:id(\\d+)",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (id === req.user!.id) throw badRequest("You cannot delete your own account.");
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.is_admin) throw notFound("Admin not found.");
    if (user.is_superuser) throw forbidden("Cannot delete a super admin.");
    await prisma.user.delete({ where: { id } });
    await logAdminAction(req, {
      action: "delete_admin",
      resourceType: "admin",
      resourceId: id,
      details: { username: user.username, email: user.email },
    });
    res.status(204).send();
  }),
);

/** Reset any account's password (admin only) to a generated temporary value. */
adminsRouter.post(
  "/:id(\\d+)/reset-password",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw notFound("User not found.");
    if (user.is_admin && user.is_superuser && user.id === req.user!.id) {
      throw badRequest("Use change-password to reset your own password.");
    }
    const temp = randomTempPassword();
    await prisma.user.update({
      where: { id },
      data: { password: await hashPassword(temp), updated_at: new Date() },
    });
    await prisma.refreshToken.updateMany({
      where: { user_id: id, revoked_at: null },
      data: { revoked_at: new Date() },
    });
    await prisma.notification.create({
      data: {
        recipient_id: id,
        notification_type: "password_changed",
        title: "Your password was reset",
        message: "An administrator reset your password. Please use the link in your email to sign in and change it.",
        created_at: new Date(),
      },
    });
    await logAdminAction(req, {
      action: "reset_user_password",
      resourceType: "user",
      resourceId: id,
      details: { target: user.username },
    });
    res.json({ detail: "Password reset successfully.", temporary_password: temp });
  }),
);

function randomTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%";
  let out = "";
  for (let i = 0; i < 14; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}