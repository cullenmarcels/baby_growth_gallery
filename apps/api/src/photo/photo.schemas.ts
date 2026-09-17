import { z } from 'zod';

const today = (): string => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Invalid calendar date')
  .refine((value) => value <= today(), 'Date is in the future');

export const photoIdSchema = z.uuid();
export const photoBatchIdSchema = z.uuid();
export const createPhotoBatchSchema = z.object({
  files: z
    .array(
      z.object({
        contentType: z.string().trim().min(1).max(100),
        sizeBytes: z
          .number()
          .int()
          .min(1)
          .max(20 * 1024 * 1024),
        capturedOn: calendarDate,
      }),
    )
    .min(1)
    .max(20),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value === '' ? null : value));

export const updatePhotoSchema = z
  .object({
    title: optionalText(80).optional(),
    description: optionalText(1000).optional(),
    capturedOn: calendarDate.optional(),
    location: optionalText(80).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const batchUpdatePhotosSchema = z
  .object({
    photoIds: z.array(z.uuid()).min(1).max(20),
    capturedOn: calendarDate.optional(),
    location: optionalText(80).optional(),
    description: optionalText(1000).optional(),
  })
  .refine(
    (value) =>
      value.capturedOn !== undefined ||
      value.location !== undefined ||
      value.description !== undefined,
    'At least one shared field is required',
  );

export const publishPhotosSchema = z.object({
  photoIds: z.array(z.uuid()).min(1).max(20),
});

export const previewQuerySchema = z.object({
  variant: z.enum(['THUMBNAIL', 'DISPLAY', 'ARCHIVE']).default('DISPLAY'),
});

export const managePhotosQuerySchema = z.object({
  scope: z.enum(['mine', 'family']).default('mine'),
  status: z
    .enum(['AWAITING_UPLOAD', 'QUEUED', 'PROCESSING', 'DRAFT', 'PUBLISHED', 'TRASHED', 'FAILED'])
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).max(500).optional(),
});

export type CreatePhotoBatchInput = z.infer<typeof createPhotoBatchSchema>;
export type UpdatePhotoInput = z.infer<typeof updatePhotoSchema>;
export type BatchUpdatePhotosInput = z.infer<typeof batchUpdatePhotosSchema>;
export type PublishPhotosInput = z.infer<typeof publishPhotosSchema>;
export type ManagePhotosQuery = z.infer<typeof managePhotosQuerySchema>;
