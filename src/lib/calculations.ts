/**
 * The finance brains. Pure functions over plaintext local records, so they run
 * instantly and offline. Every amount is integer paise until formatINR().
 */

import type { Transaction, Goal, RecurringRule, Cadence } from '../types';

// --- money formatting (India) ---------------------------------------------

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹1,23,456 — Indian digit grouping (lakh/crore). Pass showPaise for ₹.99 cases. */
export function formatINR(paise: number, showPaise = false): string {
  const rupees = paise / 100;
  return showPaise ? inrPaise.format(rupees) : inr.format(rupees);
}

const inrGroup = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/**
 * Group a plain rupee number string with Indian commas for use *inside a text
 * input* — so a balance or target reads "1,20,000" as you type, not "120000".
 * Keeps only digits, drops leading zeros, and returns '' for empty so the field
 * can still be cleared. The caller keeps raw digits in state and strips commas
 * back out on change; this is display-only.
 */
export function groupIndianDigits(value: string): string {
  const clean = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!clean) return '';
  return inrGroup.format(Number(clean));
}

/** Compact form for chart labels: ₹1.2L, ₹34.5k, ₹980. */
export function formatCompactINR(paise: number): string {
  const r = Math.abs(paise) / 100;
  const sign = paise < 0 ? '-' : '';
  if (r >= 1e7) return `${sign}₹${(r / 1e7).toFixed(2)}Cr`;
  if (r >= 1e5) return `${sign}₹${(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `${sign}₹${(r / 1e3).toFixed(1)}k`;
  return `${sign}₹${Math.round(r)}`;
}

// --- month helpers --------------------------------------------------------

export function monthBounds(ref = new Date()): { start: number; end: number } {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1).getTime();
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1).getTime();
  return { start, end };
}

function daysInMonth(ref = new Date()): number {
  return new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
}

function dayOfMonth(ref = new Date()): number {
  return ref.getDate();
}

function inRange(t: Transaction, start: number, end: number): boolean {
  return !t.deleted_at && t.date >= start && t.date < end;
}

// --- the headline number: safe to spend -----------------------------------

export interface SafeToSpend {
  /** Money genuinely free this month after bills-to-come and goal set-asides. */
  amount: number;
  income: number;
  spentSoFar: number;
  billsRemaining: number; // recurring debits not yet paid this month
  goalSetAside: number;
  /** Per-day allowance for the rest of the month. */
  perDayRemaining: number;
}

/**
 * Safe to spend = income this month
 *                 − spent so far
 *                 − recurring bills still due this month
 *                 − this month's goal contributions set aside.
 *
 * This is the one number most budgeting apps bury. Lead with it.
 */
export function safeToSpend(
  txns: Transaction[],
  recurring: RecurringRule[],
  monthlyGoalSetAside: number,
  ref = new Date()
): SafeToSpend {
  const { start, end } = monthBounds(ref);
  const month = txns.filter((t) => inRange(t, start, end));

  const income = month
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);

  const spentSoFar = month
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  // Recurring debits whose next_due falls before month end and that we have not
  // already seen a matching txn for this month.
  const paidRecurringIds = new Set(
    month.filter((t) => t.recurring_id).map((t) => t.recurring_id)
  );
  const billsRemaining = recurring
    .filter((r) => r.active && r.confirmed && !r.deleted_at && r.next_due < end)
    .reduce(
      (s, r) => s + r.amount * billOccurrencesLeft(r, paidRecurringIds, ref, end),
      0
    );

  const amount = income - spentSoFar - billsRemaining - monthlyGoalSetAside;

  const daysLeft = Math.max(1, daysInMonth(ref) - dayOfMonth(ref) + 1);
  const perDayRemaining = Math.max(0, Math.round(amount / daysLeft));

  return {
    amount,
    income,
    spentSoFar,
    billsRemaining,
    goalSetAside: monthlyGoalSetAside,
    perDayRemaining,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How many times a recurring rule is still expected to hit before month end,
 * for the "bills to come" figure.
 *
 * For weekly/monthly/yearly we count a single upcoming hit — once a matching
 * txn is logged this month it's considered paid and drops to zero. A daily bill
 * can't be zeroed by one payment: it counts the days remaining from the later of
 * today and its next-due through month end.
 */
function billOccurrencesLeft(
  r: RecurringRule,
  paidIds: Set<string | null>,
  ref: Date,
  end: number
): number {
  if (r.cadence === 'daily') {
    const step = cadenceInterval(r.interval);
    const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();
    const from = Math.max(r.next_due, today);
    if (from >= end) return 0;
    // "Every N days" hits once per N-day window in the remaining span.
    return Math.ceil((end - from) / DAY_MS / step);
  }
  return paidIds.has(r.id) ? 0 : 1;
}

/** Normalise a possibly-undefined (legacy) interval to a whole number ≥ 1. */
export function cadenceInterval(interval: number | undefined | null): number {
  return Math.max(1, Math.round(interval ?? 1));
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
  ref = new Date()
): number {
  const step = cadenceInterval(interval);
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();
  const d = new Date(due);
  let guard = 0;
  while (d.getTime() < today && guard++ < 4000) {
    if (cadence === 'daily') d.setDate(d.getDate() + step);
    else if (cadence === 'weekly') d.setDate(d.getDate() + 7 * step);
    else if (cadence === 'yearly') d.setFullYear(d.getFullYear() + step);
    else d.setMonth(d.getMonth() + step);
  }
  return d.getTime();
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

// --- budget pacing --------------------------------------------------------

export type PaceStatus = 'ok' | 'watch' | 'over';

export interface CategoryPace {
  categoryId: string;
  budget: number;
  spent: number;
  /** Fraction of budget used, 0..>1. */
  used: number;
  /** Fraction of the month elapsed, 0..1. */
  monthElapsed: number;
  status: PaceStatus;
}

/**
 * Pace tells you *spent vs time*, not just spent vs total. 90% of the food
 * budget on day 18 of 30 is a warning even though it isn't "over" yet.
 */
export function categoryPace(
  categoryId: string,
  budget: number,
  spent: number,
  ref = new Date()
): CategoryPace {
  const monthElapsed = dayOfMonth(ref) / daysInMonth(ref);
  const used = budget > 0 ? spent / budget : 0;
  let status: PaceStatus = 'ok';
  if (used >= 1) status = 'over';
  else if (used > monthElapsed + 0.1) status = 'watch'; // ahead of pace by >10%
  return { categoryId, budget, spent, used, monthElapsed, status };
}

// --- goal projection ------------------------------------------------------

export interface GoalProjection {
  progress: number; // 0..1
  remaining: number; // paise
  /** Recent contribution run-rate, paise per month. */
  ratePerMonth: number;
  /** Months to completion at current rate, or null if rate is 0. */
  monthsToGo: number | null;
  /** Projected completion date, or null. */
  etaDate: number | null;
  /** If the goal has a target_date: are we on track to hit it? */
  onTrack: boolean | null;
  /** Contribution/month needed to hit target_date, if one is set. */
  neededPerMonth: number | null;
}

export function goalProjection(
  goal: Goal,
  ratePerMonth: number,
  ref = new Date()
): GoalProjection {
  const remaining = Math.max(0, goal.target - goal.saved);
  const progress = goal.target > 0 ? Math.min(1, goal.saved / goal.target) : 0;

  const monthsToGo = ratePerMonth > 0 ? remaining / ratePerMonth : null;
  const etaDate =
    monthsToGo !== null
      ? new Date(ref.getFullYear(), ref.getMonth() + Math.ceil(monthsToGo), ref.getDate()).getTime()
      : null;

  let onTrack: boolean | null = null;
  let neededPerMonth: number | null = null;
  if (goal.target_date) {
    const monthsLeft = Math.max(
      0.1,
      (goal.target_date - ref.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    );
    neededPerMonth = Math.ceil(remaining / monthsLeft);
    onTrack = ratePerMonth >= neededPerMonth || remaining === 0;
  }

  return { progress, remaining, ratePerMonth, monthsToGo, etaDate, onTrack, neededPerMonth };
}

// --- recurring detection --------------------------------------------------

/**
 * Detect likely subscriptions/bills from history: same merchant, similar amount
 * (±8%), roughly monthly spacing, at least 2 occurrences. Returns unconfirmed
 * candidate rules the UI offers the user to accept. Cheap heuristic, no model.
 */
export function detectRecurring(txns: Transaction[]): Array<{
  merchant: string;
  amount: number;
  cadence: Cadence;
  account_id: string;
  category_id: string | null;
  occurrences: number;
}> {
  const expenses = txns
    .filter((t) => t.type === 'expense' && !t.deleted_at)
    .sort((a, b) => a.date - b.date);

  const byMerchant = new Map<string, Transaction[]>();
  for (const t of expenses) {
    const key = t.merchant.trim().toLowerCase();
    if (!key) continue;
    (byMerchant.get(key) ?? byMerchant.set(key, []).get(key)!).push(t);
  }

  const out: ReturnType<typeof detectRecurring> = [];
  const DAY = 1000 * 60 * 60 * 24;

  for (const [, group] of byMerchant) {
    if (group.length < 2) continue;
    const median = group[Math.floor(group.length / 2)].amount;
    const consistent = group.filter(
      (t) => Math.abs(t.amount - median) / median <= 0.08
    );
    if (consistent.length < 2) continue;

    const gaps: number[] = [];
    for (let i = 1; i < consistent.length; i++) {
      gaps.push((consistent[i].date - consistent[i - 1].date) / DAY);
    }
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;

    let cadence: Cadence | null = null;
    if (avgGap >= 6 && avgGap <= 8) cadence = 'weekly';
    else if (avgGap >= 26 && avgGap <= 35) cadence = 'monthly';
    else if (avgGap >= 350 && avgGap <= 380) cadence = 'yearly';
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

// --- category breakdown (for the pie / treemap) ---------------------------

export interface CategorySlice {
  categoryId: string | null;
  total: number;
  share: number; // 0..1
}

export function categoryBreakdown(
  txns: Transaction[],
  start: number,
  end: number
): CategorySlice[] {
  const expenses = txns.filter(
    (t) => t.type === 'expense' && inRange(t, start, end)
  );
  const total = expenses.reduce((s, t) => s + t.amount, 0);
  const byCat = new Map<string | null, number>();
  for (const t of expenses) {
    byCat.set(t.category_id, (byCat.get(t.category_id) ?? 0) + t.amount);
  }
  return [...byCat.entries()]
    .map(([categoryId, catTotal]) => ({
      categoryId,
      total: catTotal,
      share: total > 0 ? catTotal / total : 0,
    }))
    .sort((a, b) => b.total - a.total);
}
