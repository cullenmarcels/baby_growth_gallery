import { z } from 'zod';

export const milestoneIdSchema = z.uuid();
export const milestoneTemplateKeys = [
  'FIRST_ROLL_OVER',
  'FIRST_SIT_UNASSISTED',
  'FIRST_CRAWL',
  'FIRST_STAND',
  'FIRST_STEP',
  'FIRST_LAUGH_OUT_LOUD',
  'FIRST_CALL_FAMILY',
  'FIRST_WAVE',
  'FIRST_GRASP',
  'FIRST_SOLID_FOOD',
  'FIRST_TOOTH',
  'FIRST_SELF_FEED',
] as const;
const date = z.iso.date();
const nullableDate = date.nullable().optional();
const trimmedTitle = z.string().trim().min(1).max(40);
const note = z.string().trim().max(1000).nullable().optional();
const version = z.coerce.number().int().positive();
const photoIds = z.array(z.uuid());

export const createMilestoneSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('TEMPLATE'),
    templateKey: z.enum(milestoneTemplateKeys),
    reminderOn: nullableDate,
  }),
  z.object({ source: z.literal('CUSTOM'), title: trimmedTitle, reminderOn: nullableDate }),
]);
export const updateMilestoneSchema = z
  .object({
    expectedVersion: version,
    title: trimmedTitle.optional(),
    reminderOn: nullableDate,
  })
  .refine((value) => value.title !== undefined || value.reminderOn !== undefined, {
    message: '至少需要修改一个字段。',
  });
export const completeMilestoneSchema = z.object({
  expectedVersion: version,
  completedOn: date,
  completionNote: note,
  photoIds,
});
export const reopenMilestoneSchema = z.object({ expectedVersion: version });
export const deleteMilestoneQuerySchema = z.object({ expectedVersion: version });
export const milestoneListQuerySchema = z.object({
  state: z.enum(['PENDING', 'COMPLETED']),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).max(1000).optional(),
});
export const milestoneOverviewQuerySchema = z.object({
  fromOn: date,
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).max(1000).optional(),
});

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
export type CompleteMilestoneInput = z.infer<typeof completeMilestoneSchema>;
export type MilestoneListQuery = z.infer<typeof milestoneListQuerySchema>;
export type MilestoneOverviewQuery = z.infer<typeof milestoneOverviewQuerySchema>;
