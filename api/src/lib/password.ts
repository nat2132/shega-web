import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * Password hashing compatible with the legacy Django backend.
 *
 * Imported rows from Django store `pbkdf2_sha256$iterations$salt$hash` values.
 * `verifyPassword` detects that prefix and verifies via Node's pbkdf2 so that
 * existing admin logins keep working after migration. New/changed passwords are
 * hashed with bcrypt.
 */

const PBKDF2_PREFIX = "pbkdf2_sha256$";
export const BCRYPT_PREFIX = "$2a$";
export const BCRYPT_PREFIXES = ["$2a$", "$2b$", "$2y$"];

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function isDjangoHash(hash: string): boolean {
  return hash.startsWith(PBKDF2_PREFIX);
}

export function verifyDjangoHash(password: string, stored: string): boolean {
  try {
    // Format: pbkdf2_sha256$<iterations>$<salt>$<derived>
    const [algorithm, iterationsRaw, salt, derived] = stored.split("$");
    if (algorithm !== "pbkdf2_sha256") return false;
    const iterations = Number.parseInt(iterationsRaw, 10);
    if (!Number.isFinite(iterations) || iterations <= 0) return false;
    const derivedBytes = Buffer.from(derived, "base64");
    const candidate = crypto.pbkdf2Sync(password, salt, iterations, derivedBytes.length, "sha256");
    const a = Buffer.from(candidate);
    const b = Buffer.from(derivedBytes);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  if (isDjangoHash(stored)) {
    return verifyDjangoHash(password, stored);
  }
  return bcrypt.compare(password, stored);
}