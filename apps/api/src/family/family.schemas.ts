import { z } from 'zod';

const trimmedText = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum);

export const familyIdSchema = z.uuid();
export const createFamilySchema = z.object({
  name: trimmedText(1, 40),
  displayName: trimmedText(1, 30),
});
export const changeMemberRoleSchema = z.object({ role: z.enum(['ADMIN', 'MEMBER']) });
export const acceptInvitationSchema = z.object({
  token: z.string().trim().min(1).max(32),
  displayName: trimmedText(1, 30),
});
export const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).max(512).optional(),
});

export type ActivityQuery = z.infer<typeof activityQuerySchema>;
