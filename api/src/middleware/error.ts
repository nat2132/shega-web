import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ApiError } from "../lib/errors";

/** Strips the trailing slash so `/api/auth/login/` matches the `/api/auth/login` route. */
export function stripTrailingSlash(req: Request, _res: Response, next: NextFunction): void {
  if (req.path.length > 1 && req.path.endsWith("/")) {
    req.url = req.url.replace(/\/+$/, "") || "/";
  }
  next();
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ detail: "Not found." });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ detail: err.message });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(400).json({ detail: "A record with these values already exists.", meta: err.meta });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ detail: "Not found." });
      return;
    }
  }
  if (err instanceof SyntaxError) {
    res.status(400).json({ detail: "Invalid JSON body." });
    return;
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ detail: "Internal server error." });
}