import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: int("PORT", 3001),
  publicApiUrl: process.env.PUBLIC_API_URL || "http://localhost:3001/api",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || "1h",
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL || "30d",
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  loginLockoutThreshold: int("LOGIN_LOCKOUT_THRESHOLD", 5),
  loginLockoutWindowMinutes: int("LOGIN_LOCKOUT_WINDOW_MINUTES", 15),
  rateLimitGlobal: int("RATE_LIMIT_GLOBAL", 0),
  rateLimitLogin: int("RATE_LIMIT_LOGIN", 10),
  rateLimitRegister: int("RATE_LIMIT_REGISTER", 5),
  rateLimitAdmin: int("RATE_LIMIT_ADMIN", 600),
  trustProxy: int("TRUST_PROXY", 1),

  githubToken: process.env.GITHUB_TOKEN || "",
  githubOwner: process.env.GITHUB_OWNER || "nat2132",
  githubRepo: process.env.GITHUB_REPO || "shega-mobile",
  githubCacheTtl: int("GITHUB_CACHE_TTL", 600),

  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: int("SMTP_PORT", 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  mailFrom: process.env.MAIL_FROM || "no-reply@shega.com",
  mailFromName: process.env.MAIL_FROM_NAME || "SHEGA",
};

export const mailEnabled = (): boolean => Boolean(process.env.SMTP_HOST);