import { Router } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { wrap, badRequest, unauthorized, tooMany } from "../../lib/errors";
import { hashPassword, verifyPassword } from "../../lib/password";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  sha256,
  REFRESH_TTL_SECONDS,
} from "../../lib/tokens";
import { serializeUser } from "../../lib/serializers";
import { requireAuth } from "../../middleware/auth";
import { clientIp, clientUserAgent } from "../../lib/audit";
import { env } from "../../config/env";

export const authRouter = Router();

const loginLimit = rateLimit({
  windowMs: 60_000,
  max: env.rateLimitLogin,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.rateLimitLogin === 0,
  handler: (_req, res) => {
    res.status(429).json({ detail: "Too many login attempts. Please try again later." });
  },
});

async function resolveIdentifier(value: string): Promise<string> {
  if (value.includes("@")) {
    const rows = await prisma.$queryRaw<Array<{ username: string }>>`
      SELECT username FROM accounts_user
      WHERE LOWER(email) = LOWER(${value})
      LIMIT 1
    `;
    if (rows.length > 0) return rows[0].username;
  }
  return value;
}

async function failedAttempts(identifier: string): Promise<number> {
  const windowStart = new Date(Date.now() - env.loginLockoutWindowMinutes * 60_000);
  return prisma.loginAttempt.count({
    where: { identifier, success: false, timestamp: { gte: windowStart } },
  });
}

async function recordAttempt(
  identifier: string,
  user_id: number | null,
  success: boolean,
  ip: string,
  userAgent: string,
): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      identifier,
      ip_address: ip || "0.0.0.0",
      user_id,
      success,
      outcome: success ? "success" : "failed",
      user_agent: userAgent,
      timestamp: new Date(),
    },
  });
}

async function issueTokens(req: Request, user_id: number): Promise<{ access: string; refresh: string }> {
  const access = signAccessToken(user_id);
  const refresh = signRefreshToken(user_id);
  const decoded = jwt.decode(refresh) as { jti: string };
  const jti = decoded.jti;
  const now = new Date();
  await prisma.refreshToken.create({
    data: {
      user_id,
      jti,
      token_hash: sha256(refresh),
      expires_at: new Date(now.getTime() + REFRESH_TTL_SECONDS * 1000),
      ip_address: clientIp(req),
      user_agent: clientUserAgent(req),
      created_at: now,
    },
  });
  return { access, refresh };
}

async function revokeByJti(jti: string, replacedBy?: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { jti, revoked_at: null },
    data: { revoked_at: new Date(), replaced_by_jti: replacedBy ?? null },
  });
}

authRouter.post(
  "/login",
  loginLimit,
  wrap(async (req: Request, res: Response) => {
    const schema = z.object({
      username: z.string().min(1, "This field is required."),
      password: z.string().min(1, "This field is required."),
    });
    const raw = schema.safeParse({
      username: req.body?.username ?? req.body?.email ?? "",
      password: req.body?.password ?? "",
    });
    if (!raw.success) {
      const field = raw.error.issues[0]?.path[0] === "password" ? "password" : "username";
      res.status(400).json({ [field]: ["This field is required."] });
      return;
    }

    const ip = clientIp(req) ?? "0.0.0.0";
    const ua = clientUserAgent(req);
    const identifier = (await resolveIdentifier(raw.data.username)) || ip || "unknown";

    const recentFailures = await failedAttempts(identifier);
    if (recentFailures >= env.loginLockoutThreshold) {
      res.status(429).json({
        detail: `Too many failed login attempts. Please try again in ${env.loginLockoutWindowMinutes} minutes.`,
      });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { username: identifier },
    });
    const valid = user ? await verifyPassword(raw.data.password, user.password) : false;

    if (!user || !valid || !user.is_active) {
      await recordAttempt(identifier, user?.id ?? null, false, ip, ua);
      res.status(401).json({ detail: "No active account found with the given credentials" });
      return;
    }

    await recordAttempt(identifier, user.id, true, ip, ua);
    const tokens = await issueTokens(req, user.id);

    if (user.is_admin || user.is_staff || user.is_superuser) {
      await prisma.adminSession.create({
        data: {
          admin_id: user.id,
          ip_address: ip || null,
          user_agent: ua,
          login_time: new Date(),
          is_active: true,
        },
      });
    }

    res.json({
      access: tokens.access,
      refresh: tokens.refresh,
      user: serializeUser(user),
    });
  }),
);

authRouter.post(
  "/refresh",
  wrap(async (req: Request, res: Response) => {
    const token = String(req.body?.refresh ?? "");
    if (!token) {
      res.status(401).json({ detail: "Refresh token is required." });
      return;
    }
    try {
      const ctx = verifyRefreshToken(token);
      const existing = await prisma.refreshToken.findUnique({ where: { jti: ctx.jti } });
      if (!existing || existing.revoked_at) {
        res.status(401).json({ detail: "Token is invalid or expired" });
        return;
      }
      const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
      if (!user || !user.is_active) {
        res.status(401).json({ detail: "User is inactive or does not exist." });
        return;
      }
      const access = signAccessToken(user.id);
      const refresh = signRefreshToken(user.id);
      const jti = (jwt.decode(refresh) as { jti: string }).jti;
      const now = new Date();
      await revokeByJti(ctx.jti, jti);
      await prisma.refreshToken.create({
        data: {
          user_id: user.id,
          jti,
          token_hash: sha256(refresh),
          expires_at: new Date(now.getTime() + REFRESH_TTL_SECONDS * 1000),
          ip_address: clientIp(req),
          user_agent: clientUserAgent(req),
          created_at: now,
        },
      });
      res.json({ access, refresh });
    } catch {
      res.status(401).json({ detail: "Token is invalid or expired" });
    }
  }),
);

authRouter.post(
  "/logout",
  requireAuth,
  wrap(async (req: Request, res: Response) => {
    const token = String(req.body?.refresh ?? "");
    if (!token) {
      res.status(400).json({ error: "Refresh token is required." });
      return;
    }
    try {
      await revokeByJti(verifyRefreshToken(token).jti);
      await prisma.adminSession.updateMany({
        where: { admin_id: req.user?.id, is_active: true },
        data: { logout_time: new Date(), is_active: false },
      });
      res.status(205).send();
    } catch {
      res.status(400).json({ error: "Invalid refresh token." });
    }
  }),
);

authRouter.get(
  "/profile",
  requireAuth,
  wrap(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw unauthorized("User does not exist.");
    res.json(serializeUser(user));
  }),
);

authRouter.patch(
  "/profile",
  requireAuth,
  wrap(async (req: Request, res: Response) => {
    const schema = z.object({
      email: z.string().email().optional(),
      phone: z.string().max(20).optional().nullable(),
      business_name: z.string().max(255).optional(),
      business_type: z.string().max(50).optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
      first_name: z.string().max(150).optional(),
      last_name: z.string().max(150).optional(),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ detail: "Invalid profile data." });
      return;
    }
    const data = parsed.data;
    if (data.phone === null) data.phone = "";
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { ...data, updated_at: new Date() },
    });
    res.json(serializeUser(user));
  }),
);

authRouter.post(
  "/change-password",
  requireAuth,
  wrap(async (req: Request, res: Response) => {
    const schema = z.object({
      old_password: z.string(),
      new_password: z.string().min(8, "This password is too short. It must contain at least 8 characters."),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ detail: "Invalid password data." });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw unauthorized();
    const ok = await verifyPassword(parsed.data.old_password, user.password);
    if (!ok) {
      res.status(400).json({ old_password: ["Old password is not correct."] });
      return;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(parsed.data.new_password), updated_at: new Date() },
    });
    res.json({ detail: "Password updated successfully." });
  }),
);

authRouter.post(
  "/password-reset",
  wrap(async (req: Request, res: Response) => {
    const email = String((req.body?.email ?? "").trim()).toLowerCase();
    const rows = await prisma.$queryRaw<Array<{ id: number; email: string }>>`
      SELECT id, email FROM accounts_user
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;
    const user = rows[0];
    let resetData: Record<string, string> | undefined;
    if (user) {
      const uid = Buffer.from(String(user.id)).toString("base64url");
      const token = jwt.sign(
        { sub: String(user.id), purpose: "password_reset", uid },
        env.jwtSecret,
        { expiresIn: "1h" },
      );
      resetData = { email: user.email, uid, token };
    }
    res.json({
      detail: "If that email is registered, a reset link has been sent.",
      ...(resetData ? { reset_data: resetData } : {}),
    });
  }),
);

authRouter.post(
  "/password-reset/confirm",
  wrap(async (req: Request, res: Response) => {
    const uid = String(req.body?.uid ?? "");
    const token = String(req.body?.token ?? "");
    const password = String(req.body?.password ?? "");
    const password2 = String(req.body?.password2 ?? "");

    if (!uid || !token) {
      res.status(400).json({ detail: "Reset token and UID are required." });
      return;
    }
    if (!password || !password2) {
      res.status(400).json({ detail: "Both password fields are required." });
      return;
    }
    if (password !== password2) {
      res.status(400).json({ detail: "Passwords do not match." });
      return;
    }

    try {
      const payload = jwt.verify(token, env.jwtSecret) as { sub?: string; purpose?: string; uid?: string };
      if (payload.purpose !== "password_reset" || payload.uid !== uid) {
        res.status(400).json({ detail: "The reset link is invalid or has expired." });
        return;
      }
      const id = Number(payload.sub);
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        res.status(400).json({ detail: "The reset link is invalid." });
        return;
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await hashPassword(password), updated_at: new Date() },
      });
      res.json({ detail: "Password has been reset successfully." });
    } catch {
      res.status(400).json({ detail: "The reset link is invalid or has expired." });
    }
  }),
);