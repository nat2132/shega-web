import { Router } from "express";
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { wrap, notFound } from "../../lib/errors";
import { getPagination, paginated } from "../../lib/pagination";
import { ordering } from "../../lib/ordering";
import { dateFilter } from "../../lib/filters";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { serializeAuditLog } from "../../lib/serializers";

export const auditLogsRouter = Router();

const LOG_ORDERING = ["created_at", "id"] as const;

auditLogsRouter.use(requireAuth, requireAdmin);

function buildWhere(req: Request): Record<string, unknown> {
  const where: Record<string, unknown> = { ...dateFilter(req) };
  if (req.query.action) where.action = String(req.query.action);
  if (req.query.resource_type) where.resource_type = String(req.query.resource_type);
  if (req.query.admin) where.admin_id = Number(req.query.admin);
  const search = String(req.query.search || "").trim();
  if (search) {
    const or: Record<string, unknown>[] = [
      { action: { contains: search } },
      { resource_type: { contains: search } },
      { details: { contains: search } },
    ];
    for (const field of ["email", "username"]) {
      or.push({ admin: { [field]: { contains: search } } });
    }
    where.OR = or;
  }
  return where;
}

auditLogsRouter.get(
  "/",
  wrap(async (req: Request, res: Response) => {
    const { page, pageSize } = getPagination(req);
    const orderBy = ordering(req, LOG_ORDERING, { created_at: "desc" });
    const where = buildWhere(req);
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: { admin: true },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    res.json(paginated(req, total, logs.map((l) => serializeAuditLog(l)), page, pageSize));
  }),
);

auditLogsRouter.get(
  "/:id(\\d+)",
  wrap(async (req: Request, res: Response) => {
    const log = await prisma.auditLog.findUnique({
      where: { id: Number(req.params.id) },
      include: { admin: true },
    });
    if (!log) throw notFound("Audit log not found.");
    res.json(serializeAuditLog(log));
  }),
);