/**
 * Domain read hooks. All reads go through Dexie live queries so screens update
 * the instant a write lands. Deleted (tombstoned) rows are filtered out here so
 * callers never have to remember to.
 */
import { db } from '../lib/db';
import { useLiveQuery } from './useLiveQuery';
import { monthBounds } from '../lib/calculations';
import type {
  Account,
  Category,
  Transaction,
  Goal,
  GoalContribution,
  Investment,
  RecurringRule,
  ID,
} from '../types';

const live = <T>(t: T[] | undefined): T[] => t ?? [];

export function useAccounts(includeArchived = false): Account[] {
  return live(
    useLiveQuery(async () => {
      const all = await db.accounts.toArray();
      return all
        .filter((a) => !a.deleted_at && (includeArchived || !a.archived))
        .sort((a, b) => a.updated_at - b.updated_at);
    }, [includeArchived])
  );
}

export function useCategories(): Category[] {
  return live(
    useLiveQuery(async () => {
      const all = await db.categories.toArray();
      return all.filter((c) => !c.deleted_at).sort((a, b) => a.order - b.order);
    })
  );
}

export function useCategoryMap(): Map<ID, Category> {
  const cats = useCategories();
  return new Map(cats.map((c) => [c.id, c]));
}

export function useAccountMap(): Map<ID, Account> {
  const accounts = useAccounts(true);
  return new Map(accounts.map((a) => [a.id, a]));
}

/** All non-deleted transactions, newest first. */
export function useTransactions(): Transaction[] {
  return live(
    useLiveQuery(async () => {
      const all = await db.transactions.toArray();
      return all.filter((t) => !t.deleted_at).sort((a, b) => b.date - a.date || b.updated_at - a.updated_at);
    })
  );
}

/** Transactions within a month (defaults to the current month). */
export function useMonthTransactions(ref = new Date()): Transaction[] {
  const key = `${ref.getFullYear()}-${ref.getMonth()}`;
  return live(
    useLiveQuery(async () => {
      const { start, end } = monthBounds(ref);
      const all = await db.transactions.where('date').between(start, end, true, false).toArray();
      return all.filter((t) => !t.deleted_at).sort((a, b) => b.date - a.date);
    }, [key])
  );
}

export function useGoals(includeArchived = false): Goal[] {
  return live(
    useLiveQuery(async () => {
      const all = await db.goals.toArray();
      return all
        .filter((g) => !g.deleted_at && (includeArchived || !g.archived))
        .sort((a, b) => a.updated_at - b.updated_at);
    }, [includeArchived])
  );
}

/**
 * A single goal, or null once we know there isn't one. The tri-state matters:
 * `undefined` means the live query hasn't resolved yet, so callers can hold off
 * on rendering "not found" instead of flashing it on every cold load of the
 * page. Tombstoned goals read as null like any other missing row.
 */
export function useGoal(id: ID | undefined): Goal | null | undefined {
  return useLiveQuery(async () => {
    if (!id) return null;
    const goal = await db.goals.get(id);
    return goal && !goal.deleted_at ? goal : null;
  }, [id]);
}

export function useContributions(goalId: ID | undefined) {
  return live(
    useLiveQuery(async () => {
      if (!goalId) return [];
      const all = await db.goal_contributions.where('goal_id').equals(goalId).toArray();
      return all.filter((c) => !c.deleted_at).sort((a, b) => b.date - a.date);
    }, [goalId])
  );
}

export function useAllContributions() {
  return live(
    useLiveQuery(async () => {
      const all = await db.goal_contributions.toArray();
      return all.filter((c) => !c.deleted_at);
    })
  );
}

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

export function useRecurringRules(): RecurringRule[] {
  return live(
    useLiveQuery(async () => {
      const all = await db.recurring_rules.toArray();
      return all.filter((r) => !r.deleted_at).sort((a, b) => a.next_due - b.next_due);
    })
  );
}

// --- investments ----------------------------------------------------------

export function useInvestments(includeArchived = false): Investment[] {
  return live(
    useLiveQuery(async () => {
      const all = await db.investments.toArray();
      return all
        .filter((i) => !i.deleted_at && (includeArchived || !i.archived))
        .sort((a, b) => a.updated_at - b.updated_at);
    }, [includeArchived])
  );
}

export interface PortfolioSummary {
  invested: number; // paise
  current: number; // paise
  gain: number; // paise (current − invested)
  returnPct: number; // gain / invested, 0 when nothing invested
}

/** Roll a set of holdings into invested / current / gain totals. */
export function portfolioSummary(holdings: Investment[]): PortfolioSummary {
  const invested = holdings.reduce((s, h) => s + h.invested, 0);
  const current = holdings.reduce((s, h) => s + h.current_value, 0);
  const gain = current - invested;
  return { invested, current, gain, returnPct: invested > 0 ? gain / invested : 0 };
}

// --- balances -------------------------------------------------------------

export interface AccountBalance {
  account: Account;
  balance: number; // paise
}

/**
 * Running balance per account = opening balance + income − expense, with
 * transfers moving paise between the from/to accounts.
 *
 * `earmarkGoals` controls whether money set aside into a goal is subtracted
 * here. With it on (the default, used wherever we mean "money available to
 * spend"), a goal contribution leaves its source account so goal money is never
 * double-counted as both in the bank and saved. With it off, balances are the
 * raw money actually sitting in each account — the Accounts screen uses this so
 * it can show goal money split out explicitly rather than silently folded in.
 * Computed locally over all transactions and contributions (cheap; on-device).
 */
export function useAccountBalances(earmarkGoals = true): AccountBalance[] {
  const accounts = useAccounts(true);
  const txns = useTransactions();
  const contribs = useAllContributions();
  const goals = useGoals(true);

  const byAccount = new Map<ID, number>();
  for (const a of accounts) byAccount.set(a.id, a.opening_balance);

  for (const t of txns) {
    if (t.type === 'income') {
      byAccount.set(t.account_id, (byAccount.get(t.account_id) ?? 0) + t.amount);
    } else if (t.type === 'expense') {
      byAccount.set(t.account_id, (byAccount.get(t.account_id) ?? 0) - t.amount);
    } else if (t.type === 'transfer') {
      byAccount.set(t.account_id, (byAccount.get(t.account_id) ?? 0) - t.amount);
      if (t.to_account_id) {
        byAccount.set(t.to_account_id, (byAccount.get(t.to_account_id) ?? 0) + t.amount);
      }
    }
  }

  // Earmark goal contributions out of their source account. A positive
  // contribution leaves the account for the goal; a negative one (withdrawal)
  // comes back. Unattributed contributions (account_id null) touch no balance.
  //
  // The live-goal test has to match useGoalsReserved() exactly, or the two
  // disagree about the same money and "in accounts − set aside" stops equalling
  // the free corpus. They can diverge for real: deleteGoal() tombstones the
  // goal and its contributions together, but a sync that pulls the goal's
  // tombstone before the contributions' leaves rows whose goal is already gone.
  if (earmarkGoals) {
    const liveGoalIds = liveGoalIdSet(goals);
    for (const c of contribs) {
      if (!c.account_id || !liveGoalIds.has(c.goal_id)) continue;
      byAccount.set(c.account_id, (byAccount.get(c.account_id) ?? 0) - c.amount);
    }
  }

  return accounts.map((account) => ({ account, balance: byAccount.get(account.id) ?? 0 }));
}

/**
 * Total money currently set aside into still-existing goals out of real accounts
 * (adds minus withdrawals), never below zero. This is exactly the amount
 * `useAccountBalances(false)` leaves in accounts that `useAccountBalances(true)`
 * takes out — the bridge between "in accounts" and "free corpus". Contributions
 * to a deleted goal, ones funded from a holding, and unattributed ones don't
 * reserve anything here.
 */
export function useGoalsReserved(): number {
  const goals = useGoals(true);
  const contribs = useAllContributions();
  const liveGoalIds = liveGoalIdSet(goals);
  const reserved = contribs.reduce(
    (s, c) => (c.account_id && liveGoalIds.has(c.goal_id) ? s + c.amount : s),
    0
  );
  return Math.max(0, reserved);
}

/**
 * The same idea for holdings: how much of each investment's current value is
 * spoken for by a goal, keyed by investment id. A goal funded out of a mutual
 * fund earmarks part of that fund exactly as an account contribution earmarks
 * part of a balance, so the same rupee is never both "invested and free" and
 * "saved toward the house".
 */
export function useInvestmentEarmarks(): Map<ID, number> {
  const goals = useGoals(true);
  const contribs = useAllContributions();
  const liveGoalIds = liveGoalIdSet(goals);
  const byInvestment = new Map<ID, number>();
  for (const c of contribs) {
    if (!c.investment_id || !liveGoalIds.has(c.goal_id)) continue;
    byInvestment.set(c.investment_id, (byInvestment.get(c.investment_id) ?? 0) + c.amount);
  }
  for (const [id, amount] of byInvestment) byInvestment.set(id, Math.max(0, amount));
  return byInvestment;
}

/** Total set aside into goals out of holdings rather than accounts. */
export function useGoalsReservedFromInvestments(): number {
  const earmarks = useInvestmentEarmarks();
  let total = 0;
  for (const amount of earmarks.values()) total += amount;
  return total;
}

export interface NetWorth {
  /** Raw money sitting in accounts, before goal earmarks come out. */
  inAccounts: number;
  /** Latest value of every holding, before goal earmarks come out. */
  inInvestments: number;
  /** What was put into those holdings (cost basis). */
  invested: number;
  /** Everything you have: accounts + holdings. */
  total: number;
  /** Goal money living in accounts. */
  reservedFromAccounts: number;
  /** Goal money living in holdings. */
  reservedFromInvestments: number;
  reserved: number;
  /** What's left once every goal has taken its share. */
  free: number;
}

/**
 * The one number that ties the three money screens together: what you have,
 * where it sits, and how much of it is already promised to a goal.
 *
 * Accounts and investments are both counted at face value and the goal earmarks
 * are subtracted once, at the end — so moving a goal's funding from a savings
 * account to a mutual fund changes where the money sits without changing what's
 * free, which is the whole point of showing them together.
 */
export function useNetWorth(): NetWorth {
  const balances = useAccountBalances(false);
  const holdings = useInvestments();
  const reservedFromAccounts = useGoalsReserved();
  const reservedFromInvestments = useGoalsReservedFromInvestments();

  const inAccounts = balances
    .filter((b) => !b.account.archived)
    .reduce((s, b) => s + b.balance, 0);
  const inInvestments = holdings.reduce((s, h) => s + h.current_value, 0);
  const invested = holdings.reduce((s, h) => s + h.invested, 0);
  const reserved = reservedFromAccounts + reservedFromInvestments;
  const total = inAccounts + inInvestments;

  return {
    inAccounts,
    inInvestments,
    invested,
    total,
    reservedFromAccounts,
    reservedFromInvestments,
    reserved,
    free: total - reserved,
  };
}

export interface FundingSlice {
  kind: 'account' | 'investment' | 'unattributed';
  id: ID | null;
  name: string;
  color: string;
  amount: number; // paise, net of withdrawals
}

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
      kind === 'account' ? accounts.get(id as ID) : kind === 'investment' ? investments.get(id as ID) : undefined;
    byKey.set(key, {
      kind,
      id,
      name: source?.name ?? (kind === 'unattributed' ? 'Not linked to a source' : 'Removed source'),
      color: source?.color ?? '#6B6E68',
      amount: c.amount,
    });
  }
  return [...byKey.values()].filter((s) => s.amount > 0).sort((a, b) => b.amount - a.amount);
}

/**
 * Net money moved into still-existing goals during `ref`'s month (adds minus
 * withdrawals, never below zero) — the goal term in safeToSpend().
 *
 * Counting only live goals is what lets withdrawing the money back, or deleting
 * the goal outright, release it into safe-to-spend instead of leaving it stuck
 * in the corpus.
 */
export function useMonthlyGoalSetAside(ref = new Date()): number {
  const goals = useGoals(true);
  const contribs = useAllContributions();
  const { start, end } = monthBounds(ref);
  const liveGoalIds = liveGoalIdSet(goals);
  return Math.max(
    0,
    contribs
      .filter((c) => c.date >= start && c.date < end && liveGoalIds.has(c.goal_id))
      .reduce((s, c) => s + c.amount, 0)
  );
}

/**
 * Goals that should still reserve money. Shared by the hooks above so the
 * earmark rule is defined in exactly one place — they describe the same money
 * from different angles and must never drift apart.
 */
function liveGoalIdSet(goals: Goal[]): Set<ID> {
  return new Set(goals.map((g) => g.id));
}
