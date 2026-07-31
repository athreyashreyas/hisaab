/**
 * Calendar helpers, all in the device's local timezone.
 *
 * Hisaab stores a transaction's *day*, not the instant it was typed, as a local
 * midnight epoch. Every conversion in the app has to agree on that, which is why
 * these live in one module: the two bugs this shape of code produces (a UTC
 * midnight landing on the previous day west of Greenwich, and an IST date
 * exporting a day early) both came from a one-off conversion done locally.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Local midnight epoch for a given date. */
export function midnight(d: Date | number = new Date()): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/** Half-open [start, end) bounds of the month containing `ref`. */
export function monthBounds(ref = new Date()): { start: number; end: number } {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1).getTime();
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1).getTime();
  return { start, end };
}

/** How many days the month containing `ref` has. */
export function daysInMonth(ref = new Date()): number {
  return new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
}

/** Day of the month for `ref`, 1-based. */
export function dayOfMonth(ref = new Date()): number {
  return ref.getDate();
}

/**
 * Local calendar date as YYYY-MM-DD.
 *
 * Not toISOString().slice(0,10): transactions store *local* midnight, and in any
 * timezone ahead of UTC that instant is still the previous day in UTC — so an
 * IST ledger exported every row a day early.
 */
export function isoDay(d: Date | number = new Date()): string {
  const x = new Date(d);
  const month = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${month}-${day}`;
}
