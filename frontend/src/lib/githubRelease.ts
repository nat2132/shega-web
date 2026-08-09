// Client-side helper for resolving the latest Shega Mobile APK from the
// public GitHub Releases API. No credentials are required — the endpoint is
// public — and nothing sensitive is exposed to the browser.
//
// The latest release info is cached in memory + localStorage for
// CACHE_TTL_MS so the website does not hammer the GitHub API on every click.
// When a new release is published, the cache expires naturally and the next
// click picks it up automatically.

export interface GitHubAsset {
  name: string;
  size: number;
  browser_download_url: string;
  content_type: string;
}

export interface GitHubRelease {
  id?: number;
  tag_name: string;
  name: string;
  published_at: string;
  prerelease: boolean;
  body?: string;
  assets: GitHubAsset[];
}

interface CachedRelease {
  release: GitHubRelease;
  fetchedAt: number;
}

interface CachedReleaseList {
  releases: GitHubRelease[];
  fetchedAt: number;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://shega-api-dah3.onrender.com/api";
const API_URL = `${API_BASE}/github/release/`;
const LIST_API_URL = `${API_BASE}/github/releases/`;

const CACHE_KEY = "shega_latest_release";
const CACHE_LIST_KEY = "shega_recent_releases";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let memoryCache: CachedRelease | null = null;
let memoryListCache: CachedReleaseList | null = null;

export class ReleaseLookupError extends Error {
  kind: "no_release" | "no_apk" | "api_error";
  constructor(kind: "no_release" | "no_apk" | "api_error", message: string) {
    super(message);
    this.kind = kind;
  }
}

export function getCachedRelease(): GitHubRelease | null {
  if (memoryCache) {
    if (Date.now() - memoryCache.fetchedAt < CACHE_TTL_MS) {
      return memoryCache.release;
    }
    memoryCache = null;
  }
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRelease;
    if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
      memoryCache = parsed;
      return parsed.release;
    }
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* corrupted cache is ignored */
  }
  return null;
}

function setCachedRelease(release: GitHubRelease): void {
  const entry: CachedRelease = { release, fetchedAt: Date.now() };
  memoryCache = entry;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* storage may be unavailable (private mode); memory cache still works */
  }
}

function getCachedReleaseList(): GitHubRelease[] | null {
  if (memoryListCache) {
    if (Date.now() - memoryListCache.fetchedAt < CACHE_TTL_MS) {
      return memoryListCache.releases;
    }
    memoryListCache = null;
  }
  try {
    const raw = localStorage.getItem(CACHE_LIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedReleaseList;
    if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
      memoryListCache = parsed;
      return parsed.releases;
    }
    localStorage.removeItem(CACHE_LIST_KEY);
  } catch {
    /* corrupted cache is ignored */
  }
  return null;
}

function setCachedReleaseList(releases: GitHubRelease[]): void {
  const entry: CachedReleaseList = { releases, fetchedAt: Date.now() };
  memoryListCache = entry;
  try {
    localStorage.setItem(CACHE_LIST_KEY, JSON.stringify(entry));
  } catch {
    /* storage may be unavailable (private mode); memory cache still works */
  }
}

export async function fetchLatestRelease(useCache = true): Promise<GitHubRelease> {
  if (useCache) {
    const cached = getCachedRelease();
    if (cached) return cached;
  }

  let response: Response;
  try {
    response = await fetch(API_URL, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });
  } catch {
    throw new ReleaseLookupError(
      "api_error",
      "Unable to prepare the download. Please try again.",
    );
  }

  if (response.status === 404) {
    throw new ReleaseLookupError(
      "no_release",
      "Download is currently unavailable. Please try again later.",
    );
  }
  if (!response.ok) {
    throw new ReleaseLookupError(
      "api_error",
      "Unable to prepare the download. Please try again.",
    );
  }

  let data: GitHubRelease;
  try {
    data = (await response.json()) as GitHubRelease;
  } catch {
    throw new ReleaseLookupError(
      "api_error",
      "Unable to prepare the download. Please try again.",
    );
  }

  setCachedRelease(data);
  return data;
}

export async function fetchRecentReleases(limit = 5, useCache = true): Promise<GitHubRelease[]> {
  if (useCache) {
    const cached = getCachedReleaseList();
    if (cached) return cached;
  }

  let response: Response;
  try {
    response = await fetch(`${LIST_API_URL}?limit=${limit}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });
  } catch {
    throw new ReleaseLookupError(
      "api_error",
      "Unable to prepare the download. Please try again.",
    );
  }

  if (!response.ok) {
    throw new ReleaseLookupError(
      "api_error",
      "Unable to prepare the download. Please try again.",
    );
  }

  let data: GitHubRelease[];
  try {
    data = (await response.json()) as GitHubRelease[];
  } catch {
    throw new ReleaseLookupError(
      "api_error",
      "Unable to prepare the download. Please try again.",
    );
  }

  setCachedReleaseList(data);
  return data;
}

// Converts a GitHub release body (Markdown) into a flat list of changelog
// bullet points for rendering on the download page.
export function parseReleaseNotes(body?: string): string[] {
  if (!body) return [];
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const bullets = lines
    .filter((line) => line.startsWith("- ") || line.startsWith("* "))
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/`/g, ""));

  if (bullets.length >= 2) return bullets;

  return lines
    .filter((line) => !line.startsWith("#") && !/^```/.test(line))
    .slice(0, 12);
}

export function findApkAsset(release: GitHubRelease): GitHubAsset | null {
  if (!release.assets?.length) return null;
  return (
    release.assets.find(
      (a) =>
        a.name.toLowerCase().endsWith(".apk") &&
        (a.content_type === "application/vnd.android.package-archive" ||
          a.content_type === "application/octet-stream" ||
          a.content_type.includes("android")),
    ) ??
    release.assets.find((a) => a.name.toLowerCase().endsWith(".apk")) ??
    null
  );
}

// Starts the APK download without leaving the page or opening GitHub.
// GitHub serves release assets with `Content-Disposition: attachment`, so
// clicking the download URL in a hidden anchor starts the file download in
// place — the user stays on the Shega website the whole time.
export async function triggerApkDownload(asset: GitHubAsset): Promise<void> {
  const link = document.createElement("a");
  link.href = asset.browser_download_url;
  link.download = asset.name;
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatReleaseLabel(release: GitHubRelease, apk: GitHubAsset | null): string {
  const version = release.tag_name.replace(/^v/i, "");
  if (apk) {
    const sizeMb = apk.size > 0 ? (apk.size / (1024 * 1024)).toFixed(1) : "";
    return `Version ${version} · ${new Date(release.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}${sizeMb ? ` · ${sizeMb} MB` : ""}`;
  }
  return `Version ${version}`;
}
