import type { Request } from "express";
import { prisma } from "./prisma";

export interface AuditEntry {
  action: string;
  resourceType: string;
  resourceId?: string | number;
  details?: Record<string, unknown>;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
}

export function clientIp(req: Request): string | null {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    return xff.split(",")[0].trim() || null;
  }
  return req.ip?.replace(/^::ffff:/, "") ?? null;
}

export function clientUserAgent(req: Request): string {
  return String(req.headers["user-agent"] ?? "").slice(0, 500);
}

/** Mirrors admin_api.views.log_admin_action. Never fails the request. */
export async function logAdminAction(req: Request, entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        admin_id: (req as Request & { user?: { id: number | string } }).user?.id
          ? Number((req as Request & { user?: { id: number | string } }).user?.id)
          : null,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: String(entry.resourceId ?? ""),
        details: entry.details ? JSON.stringify(entry.details) : "{}",
        before_state: entry.beforeState ? JSON.stringify(entry.beforeState) : "{}",
        after_state: entry.afterState ? JSON.stringify(entry.afterState) : "{}",
        ip_address: clientIp(req),
        user_agent: clientUserAgent(req),
        created_at: new Date(),
      },
    });
  } catch (err) {
    console.error("Failed to create audit log:", err);
  }
}

/** Best-effort association of the current admin's id (fallback to null). */
export function adminId(req: Request): number | null {
  const user = (req as Request & { user?: { id: number | string; sub?: string | number } }).user;
  if (!user) return null;
  const n = Number(user.id ?? user.sub);
  return Number.isFinite(n) ? n : null;
}