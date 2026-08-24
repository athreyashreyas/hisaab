import { describe, expect, it } from 'vitest';
import { DAY_MS, dayOfMonth, daysInMonth, isoDay, midnight, monthBounds } from './dates';

/**
 * Every helper here works in the device's local timezone on purpose: Hisaab
 * stores a transaction's *day*, not the instant it was typed. The two bugs this
 * module exists to prevent — a UTC midnight landing on the previous day west of
 * Greenwich, and an IST date exporting a day early — are both about the gap
 * between local and UTC, so the tests build dates locally and never through
 * Date.parse of a bare 'YYYY-MM-DD' (which JS reads as UTC).
 */
const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

describe('midnight', () => {
  it('strips the time of day, keeping the calendar date', () => {
    const noon = local(2026, 3, 10, 12, 30);
    expect(new Date(midnight(noon)).getHours()).toBe(0);
    expect(new Date(midnight(noon)).getDate()).toBe(10);
  });

  it('leaves an already-midnight instant alone', () => {
    const start = local(2026, 3, 10).getTime();
    expect(midnight(start)).toBe(start);
  });

  it('takes an epoch number as readily as a Date', () => {
    const noon = local(2026, 3, 10, 12, 30);
    expect(midnight(noon.getTime())).toBe(midnight(noon));
  });

  it('does not slide a late-evening entry into the next day', () => {
    // 23:59 is the one that goes wrong if the conversion routes through UTC in
    // any timezone ahead of Greenwich.
    expect(new Date(midnight(local(2026, 3, 10, 23, 59))).getDate()).toBe(10);
  });
});

describe('monthBounds', () => {
  it('spans the containing month half-open, [start, end)', () => {
    const { start, end } = monthBounds(local(2026, 3, 17, 9));
    expect(new Date(start).getDate()).toBe(1);
    expect(new Date(start).getMonth()).toBe(2); // March
    expect(new Date(end).getDate()).toBe(1);
    expect(new Date(end).getMonth()).toBe(3); // 1 April, exclusive
  });

  it('rolls the year over in December', () => {
    const { end } = monthBounds(local(2026, 12, 31));
    expect(new Date(end).getFullYear()).toBe(2027);
    expect(new Date(end).getMonth()).toBe(0);
  });

  it('puts the last instant of the month inside the window and the first of the next outside', () => {
    const { start, end } = monthBounds(local(2026, 2, 14));
    const lastMoment = local(2026, 2, 28, 23, 59).getTime();
    expect(lastMoment >= start && lastMoment < end).toBe(true);
    expect(local(2026, 3, 1).getTime() < end).toBe(false);
  });
});

describe('daysInMonth', () => {
  it('knows the short months', () => {
    expect(daysInMonth(local(2026, 4, 3))).toBe(30);
    expect(daysInMonth(local(2026, 1, 3))).toBe(31);
  });

  it('handles February in both a common and a leap year', () => {
    expect(daysInMonth(local(2026, 2, 3))).toBe(28);
    expect(daysInMonth(local(2028, 2, 3))).toBe(29);
  });

  it('is right on a century that is not a leap year', () => {
    expect(daysInMonth(local(2100, 2, 3))).toBe(28);
    expect(daysInMonth(local(2000, 2, 3))).toBe(29);
  });
});

describe('dayOfMonth', () => {
  it('is 1-based, so the 1st reads as 1 rather than 0', () => {
    expect(dayOfMonth(local(2026, 3, 1))).toBe(1);
    expect(dayOfMonth(local(2026, 3, 31))).toBe(31);
  });
});

describe('isoDay', () => {
  it('zero-pads month and day', () => {
    expect(isoDay(local(2026, 3, 5))).toBe('2026-03-05');
    expect(isoDay(local(2026, 12, 25))).toBe('2026-12-25');
  });

  it('reports the local date, not the UTC one', () => {
    // A local midnight is the previous day in UTC anywhere ahead of Greenwich.
    // toISOString().slice(0,10) exported an IST ledger a day early; this is the
    // regression that keeps it honest wherever the suite runs.
    const localMidnight = local(2026, 3, 10);
    expect(isoDay(localMidnight)).toBe('2026-03-10');
    expect(isoDay(local(2026, 3, 10, 23, 59))).toBe('2026-03-10');
  });

  it('takes an epoch number, matching how transactions store their date', () => {
    expect(isoDay(local(2026, 7, 4).getTime())).toBe('2026-07-04');
  });
});

describe('DAY_MS', () => {
  it('is a plain 24-hour day, the unit gap arithmetic counts in', () => {
    expect(DAY_MS).toBe(86_400_000);
  });
});
