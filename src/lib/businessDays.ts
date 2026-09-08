export type WeekendStrategy = 'next' | 'previous' | 'exact';
export type RecurrenceRuleType = 'fixed_day' | 'business_day';

export const BUSINESS_DAY_OPTIONS = [1, 2, 5, 10, 15];

function isWeekend(date: Date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

/**
 * Moves a date off the weekend according to the strategy.
 * 'next' -> Monday, 'previous' -> Friday, 'exact' -> keeps the date.
 */
export function adjustToBusinessDay(date: Date, strategy: WeekendStrategy): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  if (strategy === 'exact' || !isWeekend(result)) return result;

  if (strategy === 'next') {
    while (isWeekend(result)) result.setDate(result.getDate() + 1);
  } else {
    while (isWeekend(result)) result.setDate(result.getDate() - 1);
  }
  return result;
}

/**
 * Returns the Nth business day (Mon-Fri) of a given month.
 * If the month has fewer business days than requested, the last one is used
 * and then adjusted with the given strategy.
 */
export function getNthBusinessDay(
  year: number,
  monthIndex: number,
  nthDay: number,
  strategy: 'next' | 'previous' = 'next',
): Date {
  const target = Math.max(1, Math.floor(nthDay || 1));
  const cursor = new Date(year, monthIndex, 1, 12);
  let count = 0;
  let last = new Date(cursor);

  while (cursor.getMonth() === monthIndex) {
    if (!isWeekend(cursor)) {
      count += 1;
      last = new Date(cursor);
      if (count === target) return last;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return adjustToBusinessDay(last, strategy);
}

/** Formats a Date as 'yyyy-MM-dd' using local time. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Resolves the effective receive date for a given month/year based on
 * the recurrence rule configuration.
 */
export function resolveReceiveDate(params: {
  year: number;
  monthIndex: number;
  fixedDay?: number;
  recurrenceType: RecurrenceRuleType;
  targetBusinessDay?: number | null;
  weekendStrategy: WeekendStrategy;
}): string {
  const { year, monthIndex, fixedDay, recurrenceType, targetBusinessDay, weekendStrategy } = params;

  if (recurrenceType === 'business_day') {
    const fallback = weekendStrategy === 'previous' ? 'previous' : 'next';
    return toIsoDate(getNthBusinessDay(year, monthIndex, targetBusinessDay || 1, fallback));
  }

  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const day = Math.min(Math.max(1, fixedDay || 1), lastDay);
  return toIsoDate(adjustToBusinessDay(new Date(year, monthIndex, day, 12), weekendStrategy));
}
