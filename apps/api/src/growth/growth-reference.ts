import parameters from './reference-data/who-lms.json' with { type: 'json' };
import type { GrowthReferenceDto } from './growth.dto.js';
import type { growthMetrics, positions } from './growth.schemas.js';

export type GrowthMetric = (typeof growthMetrics)[number];
export type Position = (typeof positions)[number];
export interface ReferenceInput {
  birthDate: string;
  measuredOn: string;
  sex: 'MALE' | 'FEMALE' | null;
  lengthCm: number | null;
  weightKg: number | null;
  headCm: number | null;
  measurementPosition: Position | null;
}
type Lms = { l: number; m: number; s: number; standard: string };
const tables = parameters as unknown as Record<string, Record<string, number[][]>>;
export const ageDays = (input: Pick<ReferenceInput, 'birthDate' | 'measuredOn'>) =>
  Math.round((Date.parse(input.measuredOn) - Date.parse(input.birthDate)) / 86_400_000);

export function rawValue(input: ReferenceInput, metric: GrowthMetric): number | null {
  if (metric === 'LENGTH') return input.lengthCm;
  if (metric === 'WEIGHT') return input.weightKg;
  if (metric === 'HEAD') return input.headCm;
  return input.lengthCm && input.weightKg ? input.weightKg / (input.lengthCm / 100) ** 2 : null;
}

// The individual-assessment standards cover 0..1856 days. Beyond that, the
// 2007 reference uses fractional months and interpolation of LMS, not of z.
export function referenceParameters(input: ReferenceInput, metric: GrowthMetric): Lms | null {
  const days = ageDays(input);
  if (days < 0 || !input.sex) return null;
  const child = days <= 1856;
  if (metric === 'HEAD' && !child) return null;
  const age = child ? days : days / 30.4375;
  if (!child && age >= (metric === 'WEIGHT' ? 121 : 229)) return null;
  const group = child ? 'anthro' : 'anthroplus';
  const rows = tables[`${group}:${metric}`]?.[input.sex === 'MALE' ? '1' : '2'];
  if (!rows) return null;
  const index = Math.floor(age) - rows[0]![0]!;
  const low = rows[index];
  if (!low) return null;
  const high = rows[index + 1];
  const fraction = age - Math.floor(age);
  if (fraction && !high) return null;
  const interpolate = (column: number) =>
    low[column]! + (high ? fraction * (high[column]! - low[column]!) : 0);
  return {
    l: interpolate(1),
    m: interpolate(2),
    s: interpolate(3),
    standard: child ? (metric === 'HEAD' ? 'WHO_CHILD_2007' : 'WHO_2006') : 'WHO_2007',
  };
}

export function correctedLength(input: ReferenceInput): number | null {
  if (input.lengthCm === null) return null;
  const days = ageDays(input);
  if (days < 731 && input.measurementPosition === 'STANDING') return input.lengthCm + 0.7;
  if (days >= 731 && input.measurementPosition === 'RECUMBENT') return input.lengthCm - 0.7;
  return input.lengthCm;
}

export function valueAtZ(lms: Lms, z: number): number {
  return lms.l === 0 ? lms.m * Math.exp(lms.s * z) : lms.m * (1 + lms.l * lms.s * z) ** (1 / lms.l);
}

// Published LMS equation, with WHO's linear extension beyond +/-3 SD for
// weight/BMI. Height and head circumference use their unadjusted equation.
function zScore(value: number, lms: Lms, adjusted: boolean): number {
  const z =
    lms.l === 0
      ? Math.log(value / lms.m) / lms.s
      : Math.expm1(lms.l * Math.log(value / lms.m)) / (lms.l * lms.s);
  if (!adjusted || Math.abs(z) <= 3) return z;
  return z > 3
    ? 3 + (value - valueAtZ(lms, 3)) / (valueAtZ(lms, 3) - valueAtZ(lms, 2))
    : -3 + (value - valueAtZ(lms, -3)) / (valueAtZ(lms, -2) - valueAtZ(lms, -3));
}

function percentile(z: number): number {
  // Normal CDF approximation, error below 7.5e-8; use the unrounded z-score.
  const x = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * x);
  const tail =
    (Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI)) *
    t *
    (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return (z >= 0 ? 1 - tail : tail) * 100;
}

export function calculateReference(
  input: ReferenceInput,
  metric: GrowthMetric,
): GrowthReferenceDto {
  const unavailable = (reason: string, standard: string | null = null): GrowthReferenceDto => ({
    standard,
    zScore: null,
    percentile: null,
    reason,
  });
  if (ageDays(input) < 0) return unavailable('DATE_CONFLICT');
  if (rawValue(input, metric) === null) return unavailable('MEASUREMENT_MISSING');
  if (!input.sex) return unavailable('SEX_MISSING');
  const lms = referenceParameters(input, metric);
  if (!lms) return unavailable('AGE_UNSUPPORTED');
  const length = correctedLength(input);
  const value =
    metric === 'LENGTH'
      ? length
      : metric === 'BMI'
        ? length && input.weightKg
          ? input.weightKg / (length / 100) ** 2
          : null
        : rawValue(input, metric);
  if (value === null || value <= 0) return unavailable('MEASUREMENT_UNSUPPORTED', lms.standard);
  const z = zScore(value, lms, metric === 'WEIGHT' || metric === 'BMI');
  if (!Number.isFinite(z)) return unavailable('MEASUREMENT_UNSUPPORTED', lms.standard);
  return { standard: lms.standard, zScore: z, percentile: percentile(z), reason: null };
}
