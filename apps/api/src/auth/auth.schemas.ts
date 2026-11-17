import { z } from 'zod';
import { ApiProblemException } from '../common/api-problem.exception.js';

export const LEGAL_DRAFT_VERSION = 'draft-2026-09-10';
const invalidAccountCharacter = /[^\p{Script=Han}a-zA-Z0-9_-]/u;
const meaningfulCharacter = /[\p{Script=Han}a-zA-Z0-9]/u;

export const usernameSchema = z
  .string()
  .transform((value) =>
    value.normalize('NFC').replace(/[A-Z]/g, (character) => character.toLowerCase()),
  )
  .refine(
    (value) =>
      [...value].length <= 32 &&
      !invalidAccountCharacter.test(value) &&
      meaningfulCharacter.test(value),
  );

export const passwordSchema = z.string().min(6).max(128);
export const passwordLoginSchema = z.strictObject({
  username: usernameSchema,
  password: passwordSchema,
  remember: z.boolean().default(false),
});

export const passwordChangeSchema = z.strictObject({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
  acceptTerms: z.boolean().default(false),
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
