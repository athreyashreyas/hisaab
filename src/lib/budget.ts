/**
 * The month's arithmetic: safe to spend, budget pacing, and where it went.
 *
 * Pure functions over plaintext local records, so they run instantly and
 * offline. Every amount is integer paise until it reaches lib/money.
 */
import { DAY_MS, daysInMonth, dayOfMonth, midnight, monthBounds } from './dates';
import { cadenceInterval, merchantKey, stepCadenceBack } from './recurrence';
import type { RecurringRule, Transaction } from '../types';

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

  const income = month.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const spentSoFar = month.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const settled = settledRuleIds(month, recurring);
  const billsRemaining = recurring
    .filter((r) => r.active && r.confirmed && !r.deleted_at)
    .reduce((s, r) => s + r.amount * billOccurrencesLeft(r, settled, ref, start, end), 0);

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

/**
 * Which confirmed rules have already been paid this month.
 *
 * A transaction created from the "Repeat this" toggle carries `recurring_id` and
 * matches outright. Most real bills, though, are simply typed in when they leave
 * the account, with no link back to the rule, so a rule also counts as settled
 * when this month holds an expense from the same payee on the same account.
 * Without that fallback, "bills to come" kept subtracting rent for the whole
 * month after rent had been paid, and safe-to-spend read low for weeks.
 */
function settledRuleIds(monthTxns: Transaction[], recurring: RecurringRule[]): Set<string> {
  const linked = new Set<string>();
  const paidPayees = new Set<string>();
  for (const t of monthTxns) {
    if (t.type !== 'expense') continue;
    if (t.recurring_id) linked.add(t.recurring_id);
    const key = merchantKey(t.merchant);
    if (key) paidPayees.add(`${t.account_id}:${key}`);
  }

  const settled = new Set(linked);
  for (const r of recurring) {
    if (settled.has(r.id)) continue;
    const key = merchantKey(r.merchant);
    if (key && paidPayees.has(`${r.account_id}:${key}`)) settled.add(r.id);
  }
  return settled;
}

/**
 * How much of a recurring rule this month still expects to pay out.
 *
 * For weekly/monthly/yearly it is one hit or none, and the question is only
 * which occurrence belongs to this month. `next_due` is kept at or ahead of
 * today (rollOverdueRecurringRules), so a bill whose date has already gone by
 * this month has its next_due sitting in a later one — the occurrence that
 * counts is then the previous one. Keeping it in the total until something
 * settles it is the point: a bill due on the 3rd that nobody has paid is still
 * money owed on the 5th, and dropping it the moment its date passed would let
 * safe-to-spend quietly rise on the strength of an unpaid bill.
 *
 * A daily bill can't be zeroed by one payment: it counts the days remaining
 * from the later of today and its next-due through month end.
 */
function billOccurrencesLeft(
  r: RecurringRule,
  settled: Set<string>,
  ref: Date,
  start: number,
  end: number
): number {
  if (r.cadence === 'daily') {
    const step = cadenceInterval(r.interval);
    const from = Math.max(r.next_due, midnight(ref));
    if (from >= end) return 0;
    // "Every N days" hits once per N-day window in the remaining span.
    return Math.ceil((end - from) / DAY_MS / step);
  }

  if (settled.has(r.id)) return 0;
  const thisMonth =
    r.next_due < end
      ? r.next_due
      : stepCadenceBack(r.next_due, r.cadence, r.interval, r.anchor);
  return thisMonth >= start && thisMonth < end ? 1 : 0;
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

// --- category breakdown (for the donut / list) ----------------------------

export interface CategorySlice {
  categoryId: string | null;
  total: number;
  share: number; // 0..1
}

/**
 * Spend per category over a window, largest first.
 *
 * `liveCategoryIds`, when given, folds entries filed under a category that no
 * longer exists into the same "uncategorised" bucket as entries that never had
 * one. Without it, removing a category left its history as a second nameless
 * slice sitting alongside the real one, both rendering as "Uncategorised".
 */
export function categoryBreakdown(
  txns: Transaction[],
  start: number,
  end: number,
  liveCategoryIds?: ReadonlySet<string>
): CategorySlice[] {
  const expenses = txns.filter((t) => t.type === 'expense' && inRange(t, start, end));
  const total = expenses.reduce((s, t) => s + t.amount, 0);
  const byCat = new Map<string | null, number>();
  for (const t of expenses) {
    const id =
      t.category_id && (!liveCategoryIds || liveCategoryIds.has(t.category_id))
        ? t.category_id
        : null;
    byCat.set(id, (byCat.get(id) ?? 0) + t.amount);
  }
  return [...byCat.entries()]
    .map(([categoryId, catTotal]) => ({
      categoryId,
      total: catTotal,
      share: total > 0 ? catTotal / total : 0,
    }))
    .sort((a, b) => b.total - a.total);
}
