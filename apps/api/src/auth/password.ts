import { randomBytes } from 'node:crypto';
import { argon2id, hash } from 'argon2';

export function hashPassword(password: string): Promise<string> {
  return hash(password, { type: argon2id, memoryCost: 19 * 1_024, timeCost: 2, parallelism: 1 });
}

export function temporaryPasswordExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1_000);
}

export async function issueTemporaryPassword() {
  const temporaryPassword = randomBytes(24).toString('base64url');
  const passwordHash = await hashPassword(temporaryPassword);
  const expiresAt = temporaryPasswordExpiry();
  return { temporaryPassword, passwordHash, expiresAt };
}
