/**
 * Domain read hooks. All reads go through Dexie live queries so screens update
 * the instant a write lands. Deleted (tombstoned) rows are filtered out here so
 * callers never have to remember to.
 */
import { db } from '../lib/db';
import { useLiveQuery } from './useLiveQuery';
import { monthBounds } from '../lib/calculations';
import type { Account, Category, Transaction, Goal, Investment, RecurringRule, ID } from '../types';

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
 * Recent contribution run-rate per goal (paise/month) over the trailing ~3
 * months, used to drive goalProjection ETAs. Falls back to 0 with no history.
 */
export function monthlyRate(contribs: { goal_id: ID; amount: number; date: number }[]): Map<ID, number> {
  const since = Date.now() - 1000 * 60 * 60 * 24 * 92;
  const byGoal = new Map<ID, number>();
  for (const c of contribs) {
    if (c.date < since || c.amount <= 0) continue;
    byGoal.set(c.goal_id, (byGoal.get(c.goal_id) ?? 0) + c.amount);
  }
  const rate = new Map<ID, number>();
  for (const [goal, total] of byGoal) rate.set(goal, Math.round(total / 3));
  return rate;
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
 * Total money currently set aside into still-existing goals from real accounts
 * (adds minus withdrawals), never below zero. This is exactly the amount
 * `useAccountBalances(false)` leaves in accounts that `useAccountBalances(true)`
 * takes out — the bridge between "in accounts" and "free corpus". Contributions
 * to a deleted goal, or unattributed ones, don't reserve anything.
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
