import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { wrap } from "../../lib/errors";
import { githubErrorResponse, githubRequestJson } from "../../lib/github";

/**
 * Exposes GitHub release metadata to the marketing site (Next.js cannot hold
 * the token). Mirrors backend/api_public.views GithubReleaseProxyView and
 * GithubReleaseListView:
 *   GET /api/github/release   -> latest release
 *   GET /api/github/releases  -> recent release list (?limit=N, default 5)
 */
export const githubRouter = Router();

const githubLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ detail: "Rate limit exceeded. Please try again later." });
  },
});

githubRouter.get("/release", githubLimit, wrap(async (_req: Request, res: Response) => {
  try {
    res.json(await githubRequestJson("/releases/latest"));
  } catch (err) {
    const mapped = githubErrorResponse(err);
    res.status(mapped.status).json({ detail: mapped.detail });
  }
}));

githubRouter.get("/releases", githubLimit, wrap(async (req: Request, res: Response) => {
  const raw = Number(req.query?.limit ?? 5);
  const limit = Math.min(Math.max(Number.isFinite(raw) ? raw : 5, 1), 20);
  try {
    res.json(await githubRequestJson(`/releases?per_page=${limit}`));
  } catch (err) {
    const mapped = githubErrorResponse(err);
    res.status(mapped.status).json({ detail: mapped.detail });
  }
}));

export const ghReleaseRouter = githubRouter;