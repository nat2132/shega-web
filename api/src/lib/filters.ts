import type { Request } from "express";

export interface DateWindow {
  created_at?: { gte?: Date; lte?: Date };
}

/** DRF-compatible date_from/date_to filter (date_to is inclusive of the day). */
export function dateFilter(req: Request): DateWindow {
  const where: DateWindow = {};
  const from = String(req.query.date_from || "");
  const to = String(req.query.date_to || "");

  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    const d = new Date(`${from}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) where.created_at = { ...(where.created_at ?? {}), gte: d };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    const d = new Date(`${to}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) {
      d.setUTCDate(d.getUTCDate() + 1);
      where.created_at = { ...(where.created_at ?? {}), lte: d };
    }
  }
  return where;
}

export interface SearchableField {
  field: "license_key" | "customer_id" | "recipient_id" | "transaction_id" | "id";
  /** owner simple string field on the root row */
  self?: string;
  /** related-user simple fields */
  user?: string[];
  /** related-plan fields */
  plan?: string[];
}

export interface PrismaSearch {
  [key: string]: unknown;
}

export type SearchSpec = Record<string, string[]>;

/**
 * Build a Prisma OR predicate that mimics Django SearchFilter: LIKE on the
 * listed root fields plus the requested related-table fields.
 */
export function searchWhere(spec: SearchSpec, q: string): Record<string, unknown> | undefined {
  const trimmed = (q || "").trim();
  if (!trimmed) return undefined;
  const or: Record<string, unknown>[] = [];
  for (const [field, values] of Object.entries(spec)) {
    for (const v of values) {
      if (field === "customer") {
        or.push({ customer: { [v]: { contains: trimmed } } });
      } else if (field === "plan") {
        or.push({ plan: { [v]: { contains: trimmed } } });
      } else if (field === "admin") {
        or.push({ admin: { [v]: { contains: trimmed } } });
      } else if (field === "license") {
        or.push({ license: { [v]: { contains: trimmed } } });
      } else {
        or.push({ [field]: { contains: trimmed } });
      }
    }
  }
  return { OR: or };
}

/** True/False boolean parser for is_active/?-style query params. */
export function boolParam(value: unknown): boolean | undefined {
  if (value === undefined || value === "") return undefined;
  if (value === "true" || value === "True" || value === "1") return true;
  if (value === "false" || value === "False" || value === "0") return false;
  return undefined;
}