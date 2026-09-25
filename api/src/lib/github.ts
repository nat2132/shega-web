import { env } from "../config/env";

/**
 * GitHub release proxy for the marketing site. The frontend cannot hold a
 * GitHub token, so it fetches release metadata from /api/github/release and
 * /api/github/releases. Mirrors backend/api_public.views._github_request.
 */

const GITHUB_API_BASE = "https://api.github.com/repos";

const cache = new Map<string, { at: number; data: unknown }>();

export async function githubRequestJson(apiPath: string): Promise<unknown> {
  const url = `${GITHUB_API_BASE}/${env.githubOwner}/${env.githubRepo}${apiPath}`;
  const key = url;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < env.githubCacheTtl * 1000) return cached.data;

  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "shega-website",
      ...(env.githubToken ? { Authorization: `Bearer ${env.githubToken}` } : {}),
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const err = new Error(`GitHub API ${res.status} for ${url}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const data: unknown = await res.json().catch(() => null);
  cache.set(key, { at: Date.now(), data });
  return data;
}

export function githubErrorResponse(err: unknown): { detail: string; status: number } {
  const status = (err as { status?: number })?.status;
  if (status === 404) return { detail: "Release not found.", status: 404 };
  if (status === 403 || status === 429) return { detail: "GitHub API error.", status };
  return { detail: "GitHub API unreachable.", status: 502 };
}