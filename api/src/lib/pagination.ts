import type { Request } from "express";

export interface PageResult<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PageQuery {
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function getPagination(req: Request): PageQuery {
  const pageRaw = Number.parseInt(String(req.query.page ?? ""), 10);
  const pageSizeRaw = Number.parseInt(String(req.query.page_size ?? ""), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const requestedSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? pageSizeRaw : DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(requestedSize, MAX_PAGE_SIZE);
  return { page, pageSize };
}

export function paginated<T>(req: Request, count: number, results: T[], page: number, pageSize: number): PageResult<T> {
  const base = `${req.protocol}://${req.get("host")}${req.baseUrl}${req.path}`;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query)) {
    if (Array.isArray(v)) {
      for (const item of v) query.set(k, String(item));
    } else if (v !== undefined && v !== null) {
      query.set(k, String(v));
    }
  }

  const makeUrl = (p: number): string => {
    query.set("page", String(p));
    const qs = query.toString();
    return `${base}?${qs}`;
  };

  const totalPages = Math.ceil(count / pageSize);
  return {
    count,
    next: page < totalPages ? makeUrl(page + 1) : null,
    previous: page > 1 ? makeUrl(page - 1) : null,
    results,
  };
}