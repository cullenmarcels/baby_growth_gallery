import { z } from 'zod';

export const growthMetrics = ['LENGTH', 'WEIGHT', 'HEAD', 'BMI'] as const;
export const growthStates = ['ACTIVE', 'TRASHED'] as const;
export const positions = ['RECUMBENT', 'STANDING'] as const;
const measurement = (places: number, max: number) =>
  z
    .number()
    .finite()
    .positive()
    .max(max)
    .refine((v) => Math.abs(v * 10 ** places - Math.round(v * 10 ** places)) < 1e-7);
const fields = {
  measuredOn: z.iso.date(),
  lengthCm: measurement(1, 999999.9).nullable().optional(),
  weightKg: measurement(2, 999999.99).nullable().optional(),
  headCm: measurement(1, 999999.9).nullable().optional(),
  measurementPosition: z.enum(positions).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
};
export const growthInputSchema = z.object(fields).strict();
export const growthUpdateSchema = z
  .object({ ...growthInputSchema.partial().shape, expectedVersion: z.number().int().positive() })
  .strict()
  .refine((v) => Object.keys(v).some((k) => k !== 'expectedVersion'));
export const growthVersionSchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
});
export const growthRestoreSchema = growthVersionSchema.extend({
  measuredOn: z.iso.date().optional(),
});
export const growthListSchema = z.object({
  state: z.enum(growthStates).default('ACTIVE'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).max(2000).optional(),
});
export const growthSeriesSchema = z
  .object({
    metric: z.enum(growthMetrics),
    fromOn: z.iso.date().optional(),
    toOn: z.iso.date().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
    cursor: z.string().min(1).max(2000).optional(),
  })
  .refine((q) => !q.fromOn || !q.toOn || q.fromOn <= q.toOn);
export type GrowthInput = z.infer<typeof growthInputSchema>;
export type GrowthUpdate = z.infer<typeof growthUpdateSchema>;
export type GrowthListQuery = z.infer<typeof growthListSchema>;
export type GrowthSeriesQuery = z.infer<typeof growthSeriesSchema>;
export const chinaToday = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
