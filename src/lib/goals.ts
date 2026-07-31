/**
 * Goal pacing: the answers a savings goal actually owes you.
 *
 *   "How much do I need to add this month?"  → dueThisMonth
 *   "And next month?"                        → dueNextMonth
 *   "Am I behind, level, or ahead?"          → state + drift
 *
 * Two things can set the pace, in order of precedence:
 *
 *  1. A **plan** — "₹5,000 every month from 1 August". This is the honest one:
 *     it knows how many payments should have landed by now, so a missed payment
 *     shows up as a real shortfall in rupees *and* in payments, and the catch-up
 *     is folded into what this month asks for rather than quietly forgotten.
 *  2. A **target date** with no plan — pace falls back to a straight line from
 *     here to the deadline.
 *
 * With neither, there is nothing to be behind on, and the goal says so instead
 * of inventing a verdict. Every branch is enumerated in GoalPaceState so no goal
 * ever falls through to a misleading default (a brand-new goal used to read
 * "Behind" the moment it was created, which was both wrong and discouraging).
 *
 * All amounts are integer paise; all dates are epoch ms.
 */
import { DAY_MS, monthBounds } from './dates';
import { cadenceInterval, monthlyEquivalent } from './recurrence';
import type { Account, Cadence, Goal, GoalContribution, ID, Investment } from '../types';

const AVG_MONTH_MS = 30.44 * DAY_MS;

// --- the schedule ---------------------------------------------------------

function daysInMonthOf(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/**
 * The date of the `index`-th payment (0-based) of a schedule starting at `start`.
 *
 * Month and year steps are anchored by day-of-month with a clamp, so a plan that
 * starts on the 31st lands on the 28th/30th in short months instead of skidding
 * into the next one — `setMonth` alone turns 31 January into 3 March.
 */
export function scheduleDate(
  start: number,
  cadence: Cadence,
  interval: number,
  index: number
): number {
  const n = cadenceInterval(interval);
  const d = new Date(start);
  if (cadence === 'daily') {
    d.setDate(d.getDate() + index * n);
  } else if (cadence === 'weekly') {
    d.setDate(d.getDate() + index * 7 * n);
  } else {
    const anchorDay = d.getDate();
    d.setDate(1);
    if (cadence === 'yearly') d.setFullYear(d.getFullYear() + index * n);
    else d.setMonth(d.getMonth() + index * n);
    d.setDate(Math.min(anchorDay, daysInMonthOf(d)));
  }
  return d.getTime();
}

/**
 * How many payments of a schedule have come due at or before `until`
 * (0 if the plan hasn't started yet). Counted arithmetically rather than by
 * stepping, so a daily plan running for years costs the same as a monthly one.
 */
export function paymentsDueThrough(
  start: number,
  cadence: Cadence,
  interval: number,
  until: number
): number {
  if (until < start) return 0;
  const n = cadenceInterval(interval);

  if (cadence === 'daily' || cadence === 'weekly') {
    // Rounded to whole days first: dates are local midnight, and an hour of DST
    // drift would otherwise floor a full period away.
    const days = Math.round((until - start) / DAY_MS);
    const stepDays = (cadence === 'daily' ? 1 : 7) * n;
    return Math.floor(days / stepDays) + 1;
  }

  const s = new Date(start);
  const u = new Date(until);
  let units: number;
  if (cadence === 'yearly') {
    units = u.getFullYear() - s.getFullYear();
    if (u.getMonth() < s.getMonth() || (u.getMonth() === s.getMonth() && u.getDate() < s.getDate())) {
      units -= 1;
    }
  } else {
    units = (u.getFullYear() - s.getFullYear()) * 12 + (u.getMonth() - s.getMonth());
    if (u.getDate() < s.getDate()) units -= 1;
  }
  return units < 0 ? 0 : Math.floor(units / n) + 1;
}

/** True when a goal carries a usable contribution schedule. */
export function hasPlan(goal: Goal): boolean {
  return (
    goal.plan_amount != null &&
    goal.plan_amount > 0 &&
    goal.plan_cadence != null &&
    goal.plan_start != null
  );
}

/**
 * The per-payment amount that lands `goal` exactly on its target date at the
 * given cadence — what the form offers when you set a date and then ask for a
 * schedule. null when there's no date, or the date has already passed.
 */
export function suggestPlanAmount(
  goal: { target: number; saved: number; target_date: number | null },
  cadence: Cadence,
  interval: number,
  start: number,
  ref = new Date()
): number | null {
  if (!goal.target_date || goal.target_date <= ref.getTime()) return null;
  const remaining = Math.max(0, goal.target - goal.saved);
  if (remaining === 0) return null;
  const payments = paymentsDueThrough(start, cadence, interval, goal.target_date);
  if (payments <= 0) return null;
  return Math.ceil(remaining / payments);
}

// --- pace -----------------------------------------------------------------

export type GoalPaceState =
  /** Target met. */
  | 'reached'
  /** Running a full payment or more ahead of what was asked. */
  | 'ahead'
  /** Level with the plan, within tolerance. */
  | 'on-track'
  /** Short of where the plan says you should be by now. */
  | 'behind'
  /** The target date has passed with money still to go. */
  | 'overdue'
  /** Planned, but the first payment hasn't come due yet — nothing to judge. */
  | 'upcoming'
  /** No date and no plan: there is nothing to be on track for. */
  | 'unplanned';

export interface GoalPace {
  state: GoalPaceState;
  progress: number; // 0..1
  remaining: number; // paise still to go
  /** Observed contribution run-rate over the trailing ~3 months, paise/month. */
  ratePerMonth: number;
  /** What the plan (or the deadline) works out to per month. null when unplanned. */
  requiredPerMonth: number | null;
  /** Paise still to add before this month is out to be level with the plan. */
  dueThisMonth: number;
  /** What next month will ask for, assuming this month's ask is met. */
  dueNextMonth: number;
  /** Net paise already added this month. */
  addedThisMonth: number;
  /** Signed gap against where the plan says you should be. Positive = ahead. */
  drift: number;
  /** That gap in whole scheduled payments, signed. 0 when there's no plan. */
  driftPayments: number;
  /** The next scheduled payment date, if there's a plan. */
  nextDue: number | null;
  /** Projected completion at the observed rate. */
  etaDate: number | null;
  monthsToGo: number | null;
  /** True once the target date is behind us with money still to go. */
  targetDatePassed: boolean;
}

/**
 * Work out where a goal stands. `contributions` is that goal's live (non-deleted)
 * contributions; withdrawals count as negatives, so pulling money back out shows
 * up as falling behind rather than being silently ignored.
 */
export function goalPace(
  goal: Goal,
  contributions: GoalContribution[],
  ref = new Date()
): GoalPace {
  const now = ref.getTime();
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();
  const remaining = Math.max(0, goal.target - goal.saved);
  const progress = goal.target > 0 ? Math.min(1, goal.saved / goal.target) : 0;

  const since = now - 92 * DAY_MS;
  const ratePerMonth = Math.round(
    contributions
      .filter((c) => c.date >= since && c.amount > 0)
      .reduce((s, c) => s + c.amount, 0) / 3
  );

  const { start: monthStart, end: monthEnd } = monthBounds(ref);
  const addedThisMonth = contributions
    .filter((c) => c.date >= monthStart && c.date < monthEnd)
    .reduce((s, c) => s + c.amount, 0);

  const monthsToGo = ratePerMonth > 0 && remaining > 0 ? remaining / ratePerMonth : null;
  const etaDate =
    monthsToGo !== null
      ? new Date(
          ref.getFullYear(),
          ref.getMonth() + Math.ceil(monthsToGo),
          ref.getDate()
        ).getTime()
      : null;

  const targetDatePassed = goal.target_date != null && goal.target_date < today && remaining > 0;

  const base = {
    progress,
    remaining,
    ratePerMonth,
    addedThisMonth,
    monthsToGo,
    etaDate,
    targetDatePassed,
  };

  // Reached wins over everything: a met goal is never "behind", whatever the
  // plan or the date says.
  if (remaining === 0) {
    return {
      ...base,
      state: 'reached',
      requiredPerMonth: null,
      dueThisMonth: 0,
      dueNextMonth: 0,
      drift: 0,
      driftPayments: 0,
      nextDue: null,
    };
  }

  // --- 1. a real schedule ---------------------------------------------------
  if (hasPlan(goal)) {
    const amount = goal.plan_amount as number;
    const cadence = goal.plan_cadence as Cadence;
    const interval = goal.plan_interval;
    const planStart = goal.plan_start as number;

    const paymentsSoFar = paymentsDueThrough(planStart, cadence, interval, now);
    const expectedByNow = Math.min(goal.target, paymentsSoFar * amount);
    const drift = goal.saved - expectedByNow;

    // Expected by the end of this month, and of next. Measuring the ask against
    // the *total* saved (not just this month's additions) is what folds a missed
    // payment into the next ask instead of losing it.
    const expectedByMonthEnd = Math.min(
      goal.target,
      paymentsDueThrough(planStart, cadence, interval, monthEnd - 1) * amount
    );
    const nextMonth = monthBounds(new Date(ref.getFullYear(), ref.getMonth() + 1, 1));
    const expectedByNextMonthEnd = Math.min(
      goal.target,
      paymentsDueThrough(planStart, cadence, interval, nextMonth.end - 1) * amount
    );

    const dueThisMonth = Math.min(remaining, Math.max(0, expectedByMonthEnd - goal.saved));
    const dueNextMonth = Math.min(
      remaining - dueThisMonth,
      Math.max(0, expectedByNextMonthEnd - goal.saved - dueThisMonth)
    );

    let state: GoalPaceState;
    if (targetDatePassed) state = 'overdue';
    else if (paymentsSoFar === 0) state = 'upcoming';
    else if (drift >= amount) state = 'ahead';
    // A quarter of a payment of slack, so rounding or a payment made a day late
    // doesn't flip a steady saver into "behind".
    else if (drift >= -amount * 0.25) state = 'on-track';
    else state = 'behind';

    return {
      ...base,
      state,
      requiredPerMonth: monthlyEquivalent(amount, cadence, interval),
      dueThisMonth,
      dueNextMonth,
      drift,
      driftPayments: Math.trunc(drift / amount),
      nextDue: scheduleDate(planStart, cadence, interval, paymentsSoFar),
    };
  }

  // --- 2. a deadline, no schedule ------------------------------------------
  if (goal.target_date != null) {
    if (targetDatePassed) {
      return {
        ...base,
        state: 'overdue',
        requiredPerMonth: remaining,
        dueThisMonth: remaining,
        dueNextMonth: 0,
        drift: -remaining,
        driftPayments: 0,
        nextDue: null,
      };
    }

    const monthsLeft = Math.max((goal.target_date - now) / AVG_MONTH_MS, 1 / 30.44);
    // Never ask for more than what's actually left, however close the date is.
    const requiredPerMonth = Math.min(remaining, Math.ceil(remaining / monthsLeft));
    const dueThisMonth =
      goal.target_date < monthEnd
        ? remaining
        : Math.min(remaining, Math.max(0, requiredPerMonth - addedThisMonth));
    const dueNextMonth = Math.min(remaining - dueThisMonth, requiredPerMonth);

    // Drift is measured off a straight line from the first contribution to the
    // deadline — the best "where should I be by now" available without a plan.
    let drift = 0;
    if (contributions.length > 0) {
      const firstDate = Math.min(...contributions.map((c) => c.date));
      const span = goal.target_date - firstDate;
      if (span > 0) {
        const elapsed = Math.min(Math.max(now - firstDate, 0), span);
        drift = goal.saved - (goal.target * elapsed) / span;
      }
    }

    let state: GoalPaceState;
    if (contributions.length === 0) state = 'upcoming';
    else if (ratePerMonth >= requiredPerMonth * 1.15) state = 'ahead';
    else if (ratePerMonth >= requiredPerMonth * 0.9) state = 'on-track';
    else state = 'behind';

    return {
      ...base,
      state,
      requiredPerMonth,
      dueThisMonth,
      dueNextMonth,
      drift: Math.round(drift),
      driftPayments: 0,
      nextDue: null,
    };
  }

  // --- 3. neither ----------------------------------------------------------
  return {
    ...base,
    state: 'unplanned',
    requiredPerMonth: null,
    dueThisMonth: 0,
    dueNextMonth: 0,
    drift: 0,
    driftPayments: 0,
    nextDue: null,
  };
}

// --- grouping and funding -------------------------------------------------

/**
 * Every goal's contributions, bucketed by goal id — what the list screens need
 * to run goalPace() per row off a single live query, rather than one query per
 * goal. Goals with no history simply aren't in the map; callers use `?? []`.
 */
export function groupContributions(contribs: GoalContribution[]): Map<ID, GoalContribution[]> {
  const byGoal = new Map<ID, GoalContribution[]>();
  for (const c of contribs) {
    const list = byGoal.get(c.goal_id);
    if (list) list.push(c);
    else byGoal.set(c.goal_id, [c]);
  }
  return byGoal;
}

export interface FundingSlice {
  kind: 'account' | 'investment' | 'unattributed';
  id: ID | null;
  name: string;
  color: string;
  amount: number; // paise, net of withdrawals
}

const REMOVED_SOURCE_COLOR = '#6B6E68';

/**
 * Where a single goal's money actually came from, ready to render: one row per
 * account or holding that has funded it, largest first. Sources that net out to
 * nothing (money put in and later taken back) drop off the list.
 */
export function fundingBreakdown(
  contributions: GoalContribution[],
  accounts: Map<ID, Account>,
  investments: Map<ID, Investment>
): FundingSlice[] {
  const byKey = new Map<string, FundingSlice>();
  for (const c of contributions) {
    const kind: FundingSlice['kind'] = c.account_id
      ? 'account'
      : c.investment_id
        ? 'investment'
        : 'unattributed';
    const id = c.account_id ?? c.investment_id ?? null;
    const key = `${kind}:${id ?? 'none'}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.amount += c.amount;
      continue;
    }
    const source =
      kind === 'account'
        ? accounts.get(id as ID)
        : kind === 'investment'
          ? investments.get(id as ID)
          : undefined;
    byKey.set(key, {
      kind,
      id,
      name: source?.name ?? (kind === 'unattributed' ? 'Not linked to a source' : 'Removed source'),
      color: source?.color ?? REMOVED_SOURCE_COLOR,
      amount: c.amount,
    });
  }
  return [...byKey.values()].filter((s) => s.amount > 0).sort((a, b) => b.amount - a.amount);
}

// --- presentation ---------------------------------------------------------

export interface PaceTone {
  label: string;
  /** Tailwind text colour class for the label. */
  className: string;
  /** Background + text for a chip rendering of the same state. */
  chipClassName: string;
}

/** One place deciding what each state is called and how it reads. */
export const PACE_TONE: Record<GoalPaceState, PaceTone> = {
  reached: {
    label: 'Reached',
    className: 'text-moss-600',
    chipClassName: 'bg-moss-100 text-moss-600',
  },
  ahead: {
    label: 'Ahead',
    className: 'text-moss-600',
    chipClassName: 'bg-moss-100 text-moss-600',
  },
  'on-track': {
    label: 'On track',
    className: 'text-teal-600',
    chipClassName: 'bg-teal-50 text-teal-700',
  },
  behind: {
    label: 'Behind',
    className: 'text-amber-600',
    chipClassName: 'bg-amber-100 text-amber-600',
  },
  overdue: {
    label: 'Past its date',
    className: 'text-rose-600',
    chipClassName: 'bg-rose-100 text-rose-600',
  },
  upcoming: {
    label: 'Not started',
    className: 'text-ink-500',
    chipClassName: 'bg-parchment-200 text-ink-500',
  },
  unplanned: {
    label: 'No plan yet',
    className: 'text-ink-500',
    chipClassName: 'bg-parchment-200 text-ink-500',
  },
};
