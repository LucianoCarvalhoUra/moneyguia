export type RecurrenceScope = 'single' | 'future' | 'past' | 'all';

export const SCOPE_LABELS: Record<RecurrenceScope, string> = {
  single: 'Apenas esta',
  future: 'Esta e próximas',
  past: 'Esta e anteriores',
  all: 'Todas',
};

/** Normalizes a Date | string into a 'yyyy-MM-dd' string. */
export function toIsoDay(value: Date | string): string {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).split('T')[0];
}

export function dayOfMonth(isoDate: string): number {
  return parseInt(isoDate.split('-')[2], 10);
}

/**
 * Keeps the row's own month/year but applies the new day-of-month,
 * clamping to the last valid day of that month (e.g. 31 -> 28/29 in Feb).
 */
export function withDayOfMonth(isoDate: string, targetDay: number): string {
  const [y, m] = isoDate.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const day = Math.min(targetDay, lastDay);
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
