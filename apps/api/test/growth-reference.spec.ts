import { readFileSync } from 'node:fs';
import {
  calculateReference,
  correctedLength,
  rawValue,
  type ReferenceInput,
} from '../src/growth/growth-reference.js';

const data = readFileSync(new URL('./fixtures/growth/official-oracle.csv', import.meta.url), 'utf8')
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) => line.split(','));

describe('WHO reference differential against pinned upstream R', () => {
  it.each(data.map((row, i) => ({ row, i })))('matches unrounded official case $i', ({ row }) => {
    const [sex, days, position, length, weight, head, ...expected] = row;
    const input: ReferenceInput = {
      sex: sex === '1' ? 'MALE' : 'FEMALE',
      birthDate: '2000-01-01',
      measuredOn: new Date(Date.parse('2000-01-01') + Number(days) * 86_400_000)
        .toISOString()
        .slice(0, 10),
      lengthCm: Number(length),
      weightKg: Number(weight),
      headCm: Number(head),
      measurementPosition: position === 'L' ? 'RECUMBENT' : 'STANDING',
    };
    for (const [index, metric] of (['LENGTH', 'WEIGHT', 'HEAD', 'BMI'] as const).entries()) {
      const actual = calculateReference(input, metric);
      if (expected[index] === 'NA') expect(actual.zScore).toBeNull();
      else {
        expect(actual.reason).toBeNull();
        expect(Math.abs(actual.zScore! - Number(expected[index]))).toBeLessThanOrEqual(1e-6);
      }
    }
  });

  const input: ReferenceInput = {
    sex: 'MALE',
    birthDate: '2025-01-01',
    measuredOn: '2025-02-01',
    lengthCm: 55,
    weightKg: 4,
    headCm: 36,
    measurementPosition: 'STANDING',
  };
  it('retains raw BMI and length while correcting only reference inputs', () => {
    expect(rawValue(input, 'LENGTH')).toBe(55);
    expect(rawValue(input, 'BMI')).toBeCloseTo(4 / 0.55 ** 2);
    expect(correctedLength(input)).toBe(55.7);
    expect(input.lengthCm).toBe(55);
  });
  it('distinguishes unknown sex, missing measurements, unsupported ages and revised birth dates', () => {
    expect(calculateReference({ ...input, sex: null }, 'WEIGHT').reason).toBe('SEX_MISSING');
    expect(calculateReference({ ...input, weightKg: null }, 'BMI').reason).toBe(
      'MEASUREMENT_MISSING',
    );
    expect(calculateReference({ ...input, measuredOn: '2050-01-01' }, 'WEIGHT').reason).toBe(
      'AGE_UNSUPPORTED',
    );
    expect(calculateReference({ ...input, birthDate: '2026-01-01' }, 'WEIGHT').reason).toBe(
      'DATE_CONFLICT',
    );
  });
});
