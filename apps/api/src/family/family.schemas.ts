import { z } from 'zod';

export const familyIdSchema = z.uuid();
export const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).max(512).optional(),
});

export type ActivityQuery = z.infer<typeof activityQuerySchema>;
