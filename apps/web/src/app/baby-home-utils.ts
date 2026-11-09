import type { MilestoneSummary } from '@baby-growth-gallery/api-client';

export function shanghaiToday(): string {
  return new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
}

export function shanghaiDateAfter(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + days)).toISOString().slice(0, 10);
}

export function remindersInWindow(
  reminders: MilestoneSummary[],
  today: string,
  horizon = shanghaiDateAfter(today, 30),
): MilestoneSummary[] {
  return reminders
    .filter(
      (item) =>
        item.state === 'PENDING' &&
        item.reminderOn !== null &&
        item.reminderOn >= today &&
        item.reminderOn <= horizon,
    )
    .sort(
      (a, b) =>
        (a.reminderOn ?? '').localeCompare(b.reminderOn ?? '') ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 3);
}
