import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";

export interface AccessPayload {
  sub: string; // user id
  jti: string;
}

export interface RefreshTokenCtx {
  userId: number;
  jti: string;
}

const asSeconds = (ttl: string): number => {
  const match = /^(\d+)([smhd]?)$/.exec(ttl.trim());
  if (!match) return 3600;
  const n = Number.parseInt(match[1], 10);
  switch (match[2]) {
    case "s":
      return n;
    case "m":
      return n * 60;
    case "h":
      return n * 3600;
    case "d":
      return n * 86400;
    default:
      return n;
  }
};

export const ACCESS_TTL_SECONDS = asSeconds(env.jwtAccessTtl);
export const REFRESH_TTL_SECONDS = asSeconds(env.jwtRefreshTtl);

export function signAccessToken(userId: number): string {
  return jwt.sign({ sub: String(userId), jti: crypto.randomUUID() }, env.jwtSecret, {
    expiresIn: ACCESS_TTL_SECONDS,
  });
}

export function signRefreshToken(userId: number): string {
  return jwt.sign({ sub: String(userId), jti: crypto.randomUUID() }, env.jwtSecret, {
    expiresIn: REFRESH_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
  if (!decoded.sub) throw new Error("missing subject");
  return { sub: String(decoded.sub), jti: String(decoded.jti || "") };
}

export function verifyRefreshToken(token: string): RefreshTokenCtx {
  const decoded = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
  const userId = Number.parseInt(String(decoded.sub), 10);
  if (!Number.isFinite(userId)) throw new Error("invalid refresh token");
  return { userId, jti: String(decoded.jti || "") };
}

export function jtiFromToken(token: string): string {
  const decoded = jwt.decode(token) as jwt.JwtPayload | null;
  return String(decoded?.jti || "");
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}