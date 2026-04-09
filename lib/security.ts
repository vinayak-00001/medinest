import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const KEY_LENGTH = 64;
const SESSION_TOKEN_BYTES = 32;

export const SESSION_DURATION_SECONDS = 60 * 60 * 12;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [salt, expected] = passwordHash.split(":");
  if (!salt || !expected) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const expectedBuffer = Buffer.from(expected, "hex");

  if (derivedKey.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, expectedBuffer);
}

export function createSessionToken() {
  return `${randomUUID()}.${randomBytes(SESSION_TOKEN_BYTES).toString("hex")}`;
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
