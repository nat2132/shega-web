import type { Request } from "express";

/** Map a DRF ordering string (", "-allowed) to Prisma orderBy, ignoring unknown fields. */
export function ordering<T extends string>(
  req: Request,
  allowlist: readonly T[],
  fallback: Record<string, "asc" | "desc">,
): Record<string, "asc" | "desc">[] {
  const raw = String(req.query.ordering || "").trim();
  if (!raw) return [fallback];
  const result: Record<string, "asc" | "desc">[] = [];
  for (const part of raw.split(",")) {
    const desc = part.startsWith("-");
    const field = desc ? part.slice(1) : part;
    if (allowlist.includes(field as T)) {
      result.push({ [field]: desc ? "desc" : "asc" });
    }
  }
  return result.length > 0 ? result : [fallback];
}