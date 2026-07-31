/**
 * Cadences and recurring bills: the arithmetic behind "every 2 weeks", "next due
 * 3 Aug", and "we think this is a subscription".
 *
 * Shared by recurring rules (bills, SIPs) and by goal schedules, which is why it
 * is its own module rather than living inside either.
 */
import { DAY_MS, midnight } from './dates';
import type { Cadence, Transaction } from '../types';

/** Normalise a possibly-undefined (legacy) interval to a whole number ≥ 1. */
export function cadenceInterval(interval: number | undefined | null): number {
  return Math.max(1, Math.round(interval ?? 1));
}

function daysInMonthOf(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/**
 * Exactly one cadence step on from `from`; `direction` -1 steps backwards.
 *
 * Month and year steps are anchored by day-of-month with a clamp, because
 * `setMonth` alone overflows: 31 January plus a month is 3 March, not 28
 * February, and a rent rule on the 31st drifted a few days further into the
 * month every time it rolled. `anchorDay` is the day the rule is really pinned
 * to, so a month that was clamped short doesn't cost the rule its date forever.
 */
function step(
  from: number,
  cadence: Cadence,
  interval: number,
  direction: 1 | -1,
  anchorDay?: number
): number {
  const n = cadenceInterval(interval) * direction;
  const d = new Date(from);
  if (cadence === 'daily') {
    d.setDate(d.getDate() + n);
  } else if (cadence === 'weekly') {
    d.setDate(d.getDate() + 7 * n);
  } else {
    const day = anchorDay && anchorDay >= 1 && anchorDay <= 31 ? anchorDay : d.getDate();
    d.setDate(1);
    if (cadence === 'yearly') d.setFullYear(d.getFullYear() + n);
    else d.setMonth(d.getMonth() + n);
    d.setDate(Math.min(day, daysInMonthOf(d)));
  }
  return d.getTime();
}

/** The next occurrence after `from`. */
export function stepCadence(
  from: number,
  cadence: Cadence,
  interval = 1,
  anchorDay?: number
): number {
  return step(from, cadence, interval, 1, anchorDay);
}

/** The occurrence before `from`. */
export function stepCadenceBack(
  from: number,
  cadence: Cadence,
  interval = 1,
  anchorDay?: number
): number {
  return step(from, cadence, interval, -1, anchorDay);
}

/**
 * Advance a (possibly past) due date to the next occurrence at or after today,
 * stepping by the rule's cadence times its interval. Lets the user pick any
 * anchor date — "the 1st" — without the rule reading as already overdue, and
 * honours custom cadences like "every 2 weeks".
 */
export function rollForward(
  due: number,
  cadence: Cadence,
  interval = 1,
  ref = new Date(),
  anchorDay?: number
): number {
  const today = midnight(ref);
  let at = due;
  let guard = 0;
  while (at < today && guard++ < 4000) at = stepCadence(at, cadence, interval, anchorDay);
  return at;
}

/** The first due date for a rule being set up today: one cadence from now. */
export function firstDueFromToday(cadence: Cadence, interval = 1, ref = new Date()): number {
  return stepCadence(midnight(ref), cadence, interval);
}

/**
 * The anchor a rule is pinned to: day-of-week for a weekly cadence, day-of-month
 * otherwise. Every caller that builds a rule needs this, and getting it wrong
 * (storing a day-of-month on a weekly rule) is silent, so it lives here once.
 */
export function anchorFor(cadence: Cadence, date: number): number {
  const d = new Date(date);
  return cadence === 'weekly' ? d.getDay() : d.getDate();
}

/** Rough monthly-equivalent cost of a recurring rule, for a "committed/mo" total. */
export function monthlyEquivalent(amount: number, cadence: Cadence, interval = 1): number {
  const n = cadenceInterval(interval);
  if (cadence === 'daily') return Math.round((amount * 365) / 12 / n);
  if (cadence === 'weekly') return Math.round((amount * 52) / 12 / n);
  if (cadence === 'yearly') return Math.round(amount / 12 / n);
  return Math.round(amount / n); // monthly, once every n months
}

const CADENCE_UNIT: Record<Cadence, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
};

const CADENCE_EVERY: Record<Cadence, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

/** Human label for a cadence: "Weekly", or "Every 2 weeks" for a custom interval. */
export function cadenceLabel(cadence: Cadence, interval = 1): string {
  const n = cadenceInterval(interval);
  if (n === 1) return CADENCE_EVERY[cadence];
  return `Every ${n} ${CADENCE_UNIT[cadence]}s`;
}

// --- detection ------------------------------------------------------------

export interface DetectedRule {
  merchant: string;
  amount: number;
  cadence: Cadence;
  account_id: string;
  category_id: string | null;
  occurrences: number;
}

/**
 * Detect likely subscriptions/bills from history: same merchant, similar amount
 * (±8%), roughly monthly spacing, at least 2 occurrences. Returns unconfirmed
 * candidate rules the UI offers the user to accept. Cheap heuristic, no model.
 */
export function detectRecurring(txns: Transaction[]): DetectedRule[] {
  const expenses = txns
    .filter((t) => t.type === 'expense' && !t.deleted_at)
    .sort((a, b) => a.date - b.date);

  const byMerchant = new Map<string, Transaction[]>();
  for (const t of expenses) {
    const key = merchantKey(t.merchant);
    if (!key) continue;
    const group = byMerchant.get(key);
    if (group) group.push(t);
    else byMerchant.set(key, [t]);
  }

  const out: DetectedRule[] = [];

  for (const group of byMerchant.values()) {
    if (group.length < 2) continue;
    // `group` is in date order, so the middle *element* is the middle by date,
    // not by amount. Sort the amounts to get a real median — otherwise one odd
    // charge sitting in the middle of the run becomes the yardstick every other
    // charge is measured against, and a genuine subscription fails the ±8% test.
    const amounts = group.map((t) => t.amount).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    if (median <= 0) continue; // guards the division below
    const consistent = group.filter((t) => Math.abs(t.amount - median) / median <= 0.08);
    if (consistent.length < 2) continue;

    const gaps: number[] = [];
    for (let i = 1; i < consistent.length; i++) {
      gaps.push((consistent[i].date - consistent[i - 1].date) / DAY_MS);
    }
    // Median gap, not mean. The amount filter above drops odd charges, and each
    // one it drops leaves a double-length hole between the charges either side
    // of it — a single skipped month in a year of rent pulls the mean out of the
    // monthly window and the bill goes undetected. The median shrugs that off.
    const sortedGaps = [...gaps].sort((a, b) => a - b);
    const typicalGap = sortedGaps[Math.floor(sortedGaps.length / 2)];

    let cadence: Cadence | null = null;
    if (typicalGap >= 6 && typicalGap <= 8) cadence = 'weekly';
    else if (typicalGap >= 26 && typicalGap <= 35) cadence = 'monthly';
    else if (typicalGap >= 350 && typicalGap <= 380) cadence = 'yearly';
    if (!cadence) continue;

    const last = consistent[consistent.length - 1];
    out.push({
      merchant: last.merchant,
      amount: median,
      cadence,
      account_id: last.account_id,
      category_id: last.category_id,
      occurrences: consistent.length,
    });
  }
  return out;
}

/**
 * The canonical form of a merchant name, used wherever two entries have to be
 * recognised as the same payee: grouping history for detection, filtering a
 * suggestion the user already has a rule for, and deciding whether a bill has
 * been paid this month.
 */
export function merchantKey(merchant: string): string {
  return merchant.trim().toLowerCase();
}
