/**
 * Repository layer: the single, boring path every write goes through.
 *
 * Each mutating helper (1) stamps sync bookkeeping (updated_at / deleted_at /
 * synced_at), (2) writes PLAINTEXT into Dexie for instant local reads, and
 * (3) enqueues a sync_queue item so the encrypted-sync engine can seal and push
 * it later. Reads live in the hooks (useLiveQuery); this module owns writes.
 *
 * Deletes are tombstones: we set deleted_at (never hard-delete) so the deletion
 * propagates to other devices instead of a row resurrecting on the next pull.
 */
import { db } from './db';
import { DEFAULT_CATEGORIES, ACCENT_PALETTE } from './categories';
import type {
  Account,
  Category,
  Transaction,
  Goal,
  GoalContribution,
  RecurringRule,
  SyncTable,
  SyncOp,
  ID,
} from '../types';

export const now = (): number => Date.now();
export const newId = (): ID => crypto.randomUUID();

/** Local midnight epoch for a given date — transactions store the *day*, not the instant. */
export function midnight(d: Date | number = new Date()): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function freshMeta() {
  return { updated_at: now(), deleted_at: null, synced_at: null };
}

async function enqueue(table_name: SyncTable, operation: SyncOp, record_id: ID) {
  await db.sync_queue.add({
    table_name,
    operation,
    record_id,
    created_at: now(),
    retry_count: 0,
  });
}

// --- accounts -------------------------------------------------------------

export type NewAccount = Pick<Account, 'name' | 'kind' | 'opening_balance' | 'color'>;

export async function createAccount(input: NewAccount): Promise<Account> {
  const account: Account = {
    id: newId(),
    archived: false,
    ...input,
    ...freshMeta(),
  };
  await db.accounts.put(account);
  await enqueue('accounts', 'upsert', account.id);
  return account;
}

export async function updateAccount(id: ID, patch: Partial<Account>): Promise<void> {
  await db.accounts.update(id, { ...patch, updated_at: now(), synced_at: null });
  await enqueue('accounts', 'upsert', id);
}

export async function archiveAccount(id: ID, archived = true): Promise<void> {
  await updateAccount(id, { archived });
}

// --- categories -----------------------------------------------------------

export async function createCategory(
  input: Pick<Category, 'name' | 'icon' | 'color'> &
    Partial<Pick<Category, 'monthly_budget' | 'order'>>
): Promise<Category> {
  const count = await db.categories.count();
  const category: Category = {
    id: newId(),
    monthly_budget: null,
    order: count,
    is_default: false,
    ...input,
    ...freshMeta(),
  };
  await db.categories.put(category);
  await enqueue('categories', 'upsert', category.id);
  return category;
}

export async function updateCategory(id: ID, patch: Partial<Category>): Promise<void> {
  await db.categories.update(id, { ...patch, updated_at: now(), synced_at: null });
  await enqueue('categories', 'upsert', id);
}

// --- transactions ---------------------------------------------------------

export type NewTransaction = Pick<Transaction, 'type' | 'amount' | 'account_id'> &
  Partial<
    Pick<
      Transaction,
      | 'to_account_id'
      | 'category_id'
      | 'merchant'
      | 'note'
      | 'date'
      | 'source'
      | 'recurring_id'
      | 'splits'
    >
  >;

export async function createTransaction(input: NewTransaction): Promise<Transaction> {
  const txn: Transaction = {
    id: newId(),
    to_account_id: null,
    category_id: null,
    merchant: '',
    note: '',
    date: midnight(),
    source: 'manual',
    recurring_id: null,
    splits: null,
    ...input,
    ...freshMeta(),
  };
  await db.transactions.put(txn);
  await enqueue('transactions', 'upsert', txn.id);
  return txn;
}

export async function updateTransaction(id: ID, patch: Partial<Transaction>): Promise<void> {
  await db.transactions.update(id, { ...patch, updated_at: now(), synced_at: null });
  await enqueue('transactions', 'upsert', id);
}

export async function deleteTransaction(id: ID): Promise<void> {
  await db.transactions.update(id, { deleted_at: now(), updated_at: now(), synced_at: null });
  await enqueue('transactions', 'delete', id);
}

// --- goals ----------------------------------------------------------------

export async function createGoal(
  input: Pick<Goal, 'name' | 'target' | 'color' | 'icon'> &
    Partial<Pick<Goal, 'target_date' | 'saved'>>
): Promise<Goal> {
  const goal: Goal = {
    id: newId(),
    saved: 0,
    target_date: null,
    archived: false,
    ...input,
    ...freshMeta(),
  };
  await db.goals.put(goal);
  await enqueue('goals', 'upsert', goal.id);
  return goal;
}

export async function updateGoal(id: ID, patch: Partial<Goal>): Promise<void> {
  await db.goals.update(id, { ...patch, updated_at: now(), synced_at: null });
  await enqueue('goals', 'upsert', id);
}

export async function deleteGoal(id: ID): Promise<void> {
  await db.goals.update(id, { deleted_at: now(), updated_at: now(), synced_at: null });
  await enqueue('goals', 'delete', id);
}

/**
 * Record a contribution (or withdrawal, if negative) against a goal and keep the
 * goal's cached `saved` total in step — both in one transaction so they never
 * drift.
 */
export async function addContribution(
  goalId: ID,
  amount: number,
  note = '',
  date = midnight()
): Promise<GoalContribution> {
  const contribution: GoalContribution = {
    id: newId(),
    goal_id: goalId,
    amount,
    note,
    date,
    ...freshMeta(),
  };
  await db.transaction('rw', db.goals, db.goal_contributions, db.sync_queue, async () => {
    await db.goal_contributions.put(contribution);
    const goal = await db.goals.get(goalId);
    if (goal) {
      await db.goals.update(goalId, {
        saved: Math.max(0, goal.saved + amount),
        updated_at: now(),
        synced_at: null,
      });
    }
    await enqueue('goal_contributions', 'upsert', contribution.id);
    await enqueue('goals', 'upsert', goalId);
  });
  return contribution;
}

// --- recurring rules ------------------------------------------------------

export async function createRecurringRule(
  input: Pick<
    RecurringRule,
    'merchant' | 'amount' | 'category_id' | 'account_id' | 'cadence' | 'anchor' | 'next_due'
  > &
    Partial<Pick<RecurringRule, 'confirmed' | 'active'>>
): Promise<RecurringRule> {
  const rule: RecurringRule = {
    id: newId(),
    confirmed: false,
    active: true,
    ...input,
    ...freshMeta(),
  };
  await db.recurring_rules.put(rule);
  await enqueue('recurring_rules', 'upsert', rule.id);
  return rule;
}

export async function updateRecurringRule(id: ID, patch: Partial<RecurringRule>): Promise<void> {
  await db.recurring_rules.update(id, { ...patch, updated_at: now(), synced_at: null });
  await enqueue('recurring_rules', 'upsert', id);
}

export async function deleteRecurringRule(id: ID): Promise<void> {
  await db.recurring_rules.update(id, { deleted_at: now(), updated_at: now(), synced_at: null });
  await enqueue('recurring_rules', 'delete', id);
}

// --- seeding --------------------------------------------------------------

/**
 * First-run seed: the default category set + a Cash account, so the empty app is
 * usable immediately. Idempotent — skips if categories already exist.
 */
export async function seedDefaults(): Promise<void> {
  const existing = await db.categories.count();
  if (existing > 0) return;

  await db.transaction('rw', db.categories, db.accounts, db.sync_queue, async () => {
    await Promise.all(
      DEFAULT_CATEGORIES.map(async (c, i) => {
        const category: Category = {
          id: newId(),
          name: c.name,
          icon: c.icon,
          color: c.color,
          monthly_budget: null,
          order: i,
          is_default: true,
          ...freshMeta(),
        };
        await db.categories.put(category);
        await enqueue('categories', 'upsert', category.id);
      })
    );

    const cash: Account = {
      id: newId(),
      name: 'Cash',
      kind: 'cash',
      opening_balance: 0,
      color: ACCENT_PALETTE[5],
      archived: false,
      ...freshMeta(),
    };
    await db.accounts.put(cash);
    await enqueue('accounts', 'upsert', cash.id);
  });
}

/** Restore any missing default categories (Settings → restore defaults). */
export async function restoreDefaultCategories(): Promise<void> {
  const existing = await db.categories.toArray();
  const names = new Set(existing.filter((c) => !c.deleted_at).map((c) => c.name));
  let order = existing.length;
  for (const c of DEFAULT_CATEGORIES) {
    if (names.has(c.name)) continue;
    await createCategory({ ...c, order: order++ });
  }
}
