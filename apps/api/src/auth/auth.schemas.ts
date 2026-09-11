import { z } from 'zod';
import { ApiProblemException } from '../common/api-problem.exception.js';

export const LEGAL_DRAFT_VERSION = 'draft-2026-09-10';

const phone = z.string().trim().min(1).max(32);
const challengeId = z.uuid();
const code = z.string().regex(/^\d{6}$/);
const password = z.string().min(6).max(128);

export const verificationChallengeSchema = z.object({
  phone,
  purpose: z.enum(['REGISTER', 'LOGIN', 'RESET_PASSWORD']),
});

export const registerSchema = z.object({
  phone,
  challengeId,
  code,
  password,
  termsVersion: z.literal(LEGAL_DRAFT_VERSION),
  privacyVersion: z.literal(LEGAL_DRAFT_VERSION),
});

export const passwordLoginSchema = z.object({
  phone,
  password,
  remember: z.boolean().default(false),
});

export const codeLoginSchema = z.object({
  phone,
  challengeId,
  code,
  remember: z.boolean().default(false),
});

export const passwordResetSchema = z.object({
  phone,
  challengeId,
  code,
  newPassword: password,
});

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  throw new ApiProblemException(
    400,
    'Please correct the highlighted fields.',
    'VALIDATION_FAILED',
    result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      code: issue.code,
    })),
  );
}
