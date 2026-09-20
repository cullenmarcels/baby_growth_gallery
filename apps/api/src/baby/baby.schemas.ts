import { z } from 'zod';

const nicknameSchema = z.string().trim().min(1).max(30);
const chinaToday = (): string => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
const birthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, 'Invalid calendar date')
  .refine((value) => value <= chinaToday(), 'Birth date is in the future');

export const createBabySchema = z.object({
  nickname: nicknameSchema,
  birthDate: birthDateSchema,
  sex: z.enum(['MALE', 'FEMALE']).nullable().optional(),
});

export const updateBabySchema = z
  .object({
    nickname: nicknameSchema.optional(),
    birthDate: birthDateSchema.optional(),
    sex: z.enum(['MALE', 'FEMALE']).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const setBabyAvatarSchema = z.object({ photoId: z.uuid().nullable() });

export const babyListQuerySchema = z.object({
  includeArchived: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type CreateBabyInput = z.infer<typeof createBabySchema>;
export type UpdateBabyInput = z.infer<typeof updateBabySchema>;
export type SetBabyAvatarInput = z.infer<typeof setBabyAvatarSchema>;
