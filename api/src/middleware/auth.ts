import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyAccessToken } from "../lib/tokens";

export interface AuthUser {
  id: number;
  is_staff: boolean;
  is_admin: boolean;
  is_superuser: boolean;
  is_customer: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser | null;
    }
  }
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

/** Mirror DRF JWTAuthentication: sets req.user or 401s. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ detail: "Authentication credentials were not provided." });
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
    if (!user || !user.is_active) {
      res.status(401).json({ detail: "User is inactive or does not exist." });
      return;
    }
    req.user = {
      id: user.id,
      is_staff: user.is_staff,
      is_admin: user.is_admin,
      is_superuser: user.is_superuser,
      is_customer: user.is_customer,
    };
    next();
  } catch {
    res.status(401).json({ detail: "Given token not valid for any token type" });
  }
}

/** Admin check mirroring BaseAdminViewMixin.check_admin (runs after requireAuth). */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ detail: "Authentication credentials were not provided." });
    return;
  }
  const u = req.user;
  if (u.is_admin || u.is_superuser || u.is_staff) {
    next();
  } else {
    res.status(403).json({ detail: "Admin access required." });
  }
}