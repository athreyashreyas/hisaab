/**
 * Domain read hooks. All reads go through Dexie live queries so screens update
 * the instant a write lands. Deleted (tombstoned) rows are filtered out here so
 * callers never have to remember to.
 *
 * Only hooks live here. The pure arithmetic they hand off to sits in lib/ —
 * lib/earmarks for what goals have claimed, lib/portfolio for holdings, lib/goals
 * for pacing and funding — so the same rules can be reasoned about, and reused,
 * without a React tree around them.
 */
import { db } from '../lib/db';
import { useLiveQuery } from './useLiveQuery';
import { monthBounds } from '../lib/dates';
import { computeEarmarks, type Earmarks } from '../lib/earmarks';
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

/** Alphabetical, so a list never reshuffles just because a row was edited. */
const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

export function useAccounts(includeArchived = false): Account[] {
  return live(
    useLiveQuery(async () => {
      const all = await db.accounts.toArray();
      return all
        .filter((a) => !a.deleted_at && (includeArchived || !a.archived))
        .sort(byName);
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
      return all
        .filter((t) => !t.deleted_at)
        .sort((a, b) => b.date - a.date || b.updated_at - a.updated_at);
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
        .sort(byName);
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

export function useContributions(goalId: ID | undefined): GoalContribution[] {
  return live(
    useLiveQuery(async () => {
      if (!goalId) return [];
      const all = await db.goal_contributions.where('goal_id').equals(goalId).toArray();
      return all.filter((c) => !c.deleted_at).sort((a, b) => b.date - a.date);
    }, [goalId])
  );
}

export function useAllContributions(): GoalContribution[] {
  return live(
    useLiveQuery(async () => {
      const all = await db.goal_contributions.toArray();
      return all.filter((c) => !c.deleted_at);
    })
  );
}

export function useRecurringRules(): RecurringRule[] {
  return live(
    useLiveQuery(async () => {
      const all = await db.recurring_rules.toArray();
      return all.filter((r) => !r.deleted_at).sort((a, b) => a.next_due - b.next_due);
    })
  );
}

export function useInvestments(includeArchived = false): Investment[] {
  return live(
    useLiveQuery(async () => {
      const all = await db.investments.toArray();
      return all
        .filter((i) => !i.deleted_at && (includeArchived || !i.archived))
        .sort(byName);
    }, [includeArchived])
  );
}

// --- balances and what goals have claimed ---------------------------------

export interface AccountBalance {
  account: Account;
  balance: number; // paise
}

/**
 * Raw money sitting in each account: opening balance + income − expense, with
 * transfers moving paise between the from/to accounts. Goal set-asides are NOT
 * deducted here; they are reported separately by useEarmarks() so every screen
 * can show "in accounts" and "promised to a goal" as two figures that visibly
 * add up, rather than silently folding one into the other.
 */
export function useAccountBalances(): AccountBalance[] {
  const accounts = useAccounts(true);
  const txns = useTransactions();

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

  return accounts.map((account) => ({ account, balance: byAccount.get(account.id) ?? 0 }));
}

/**
 * What goals have claimed, per source and in total. Scoped to exactly the
 * accounts and holdings that net worth counts (active accounts, unarchived
 * holdings) and to goals that still exist, so "what you hold − what goals have
 * claimed = what's free" holds however sources come and go. See lib/earmarks.
 */
export function useEarmarks(): Earmarks {
  const goals = useGoals(true);
  const accounts = useAccounts();
  const investments = useInvestments();
  const contribs = useAllContributions();

  return computeEarmarks(
    contribs,
    new Set(goals.map((g) => g.id)),
    new Set(accounts.map((a) => a.id)),
    new Set(investments.map((i) => i.id))
  );
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
  const balances = useAccountBalances();
  const holdings = useInvestments();
  const earmarks = useEarmarks();

  const inAccounts = balances
    .filter((b) => !b.account.archived)
    .reduce((s, b) => s + b.balance, 0);
  const inInvestments = holdings.reduce((s, h) => s + h.current_value, 0);
  const invested = holdings.reduce((s, h) => s + h.invested, 0);
  const total = inAccounts + inInvestments;

  return {
    inAccounts,
    inInvestments,
    invested,
    total,
    reservedFromAccounts: earmarks.fromAccounts,
    reservedFromInvestments: earmarks.fromInvestments,
    reserved: earmarks.total,
    free: total - earmarks.total,
  };
}

/**
 * Net money moved into still-existing goals during `ref`'s month (adds minus
 * withdrawals, never below zero) — the goal term in safeToSpend().
 *
 * Counting only live goals is what lets withdrawing the money back, or deleting
 * the goal outright, release it into safe-to-spend instead of leaving it stuck
 * in the corpus. Unlike the earmarks above this counts contributions from any
 * source, attributed or not: the money left your hands this month either way.
 */
export function useMonthlyGoalSetAside(ref = new Date()): number {
  const goals = useGoals(true);
  const contribs = useAllContributions();
  const { start, end } = monthBounds(ref);
  const liveGoalIds = new Set(goals.map((g) => g.id));
  return Math.max(
    0,
    contribs
      .filter((c) => c.date >= start && c.date < end && liveGoalIds.has(c.goal_id))
      .reduce((s, c) => s + c.amount, 0)
  );
}
