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
import { midnight } from './dates';
import { rollForward } from './recurrence';
import type {
  Account,
  Category,
  Transaction,
  Goal,
  GoalContribution,
  Investment,
  RecurringRule,
  Prefs,
  SyncMeta,
  SyncTable,
  SyncOp,
  ID,
} from '../types';

export const now = (): number => Date.now();
export const newId = (): ID => crypto.randomUUID();

function freshMeta() {
  return { updated_at: now(), deleted_at: null, synced_at: null };
}

/**
 * Mark a record dirty for the sync engine. Exported because restoring a backup
 * (lib/export) writes rows straight into Dexie and has to queue them too —
 * anything that lands in Dexie without a queue entry never reaches the cloud.
 */
export async function enqueue(table_name: SyncTable, operation: SyncOp, record_id: ID) {
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

/**
 * Retire a category. A tombstone, like every other delete, so it disappears on
 * your other devices too instead of coming back on the next pull.
 *
 * Transactions already filed under it keep their `category_id` rather than being
 * rewritten: the screens all read a category through the map and fall back to
 * "Uncategorised" when it isn't there, so history stays intact and restoring the
 * category by name would pick its entries back up. Budget pacing simply drops
 * the row, since an unbudgeted bucket has no pace to show.
 */
export async function deleteCategory(id: ID): Promise<void> {
  await db.categories.update(id, { deleted_at: now(), updated_at: now(), synced_at: null });
  await enqueue('categories', 'delete', id);
}

/**
 * Persist a new category order from a drag. `ids` is the full visible list in
 * its new order; each row's `order` becomes its index. Only rows whose order
 * actually moved are written, so a drag that ends where it started doesn't
 * enqueue a sync for every category. Runs in one transaction so a half-applied
 * order can never reach the UI.
 */
export async function reorderCategories(ids: ID[]): Promise<void> {
  await db.transaction('rw', db.categories, db.sync_queue, async () => {
    const stamp = now();
    for (const [index, id] of ids.entries()) {
      const current = await db.categories.get(id);
      if (!current || current.order === index) continue;
      await db.categories.update(id, { order: index, updated_at: stamp, synced_at: null });
      await enqueue('categories', 'upsert', id);
    }
  });
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

export type GoalPlanFields = Pick<
  Goal,
  'funding_account_id' | 'funding_investment_id' | 'plan_amount' | 'plan_cadence' | 'plan_interval' | 'plan_start'
>;

export async function createGoal(
  input: Pick<Goal, 'name' | 'target' | 'color' | 'icon'> &
    Partial<Pick<Goal, 'target_date' | 'saved'> & GoalPlanFields>
): Promise<Goal> {
  const goal: Goal = {
    id: newId(),
    saved: 0,
    target_date: null,
    archived: false,
    // Goals created before funding sources and schedules existed simply have
    // these unset; the defaults keep new rows explicit rather than undefined.
    funding_account_id: null,
    funding_investment_id: null,
    plan_amount: null,
    plan_cadence: null,
    plan_interval: 1,
    plan_start: null,
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

/**
 * Delete a goal and everything hanging off it in one transaction: the goal row
 * and all of its contributions are tombstoned together. Without the cascade the
 * contributions would linger and keep counting toward "goals set aside" and the
 * earmark on account balances, so a deleted goal would silently stay in the
 * corpus. Deletes are tombstones so the removal propagates across devices.
 */
export async function deleteGoal(id: ID): Promise<void> {
  await db.transaction('rw', db.goals, db.goal_contributions, db.sync_queue, async () => {
    const stamp = { deleted_at: now(), updated_at: now(), synced_at: null };
    await db.goals.update(id, stamp);
    await enqueue('goals', 'delete', id);

    const contribs = await db.goal_contributions.where('goal_id').equals(id).toArray();
    for (const c of contribs) {
      if (c.deleted_at) continue;
      await db.goal_contributions.update(c.id, stamp);
      await enqueue('goal_contributions', 'delete', c.id);
    }
  });
}

export interface NewContribution {
  goal_id: ID;
  /** Positive to set money aside, negative to take it back out. */
  amount: number;
  /** The account it comes out of… */
  account_id?: ID | null;
  /** …or the holding it's earmarked from. At most one of the two. */
  investment_id?: ID | null;
  note?: string;
  date?: number;
}

/**
 * Record a contribution (or withdrawal, if negative) against a goal and keep the
 * goal's cached `saved` total in step — both in one transaction so they never
 * drift. The source earmarks the money out of that account's balance or that
 * holding's value (or returns it, on a withdrawal); leave both unset to record
 * money whose origin isn't tracked, which moves no balance.
 */
export async function addContribution(input: NewContribution): Promise<GoalContribution> {
  const contribution: GoalContribution = {
    id: newId(),
    account_id: null,
    investment_id: null,
    note: '',
    date: midnight(),
    ...input,
    ...freshMeta(),
  };
  await db.transaction('rw', db.goals, db.goal_contributions, db.sync_queue, async () => {
    await db.goal_contributions.put(contribution);
    const goal = await db.goals.get(contribution.goal_id);
    if (goal) {
      await db.goals.update(contribution.goal_id, {
        saved: Math.max(0, goal.saved + contribution.amount),
        updated_at: now(),
        synced_at: null,
      });
    }
    await enqueue('goal_contributions', 'upsert', contribution.id);
    await enqueue('goals', 'upsert', contribution.goal_id);
  });
  return contribution;
}

/**
 * Correct an existing contribution: a typo'd amount, the wrong source account,
 * or a date that should have been last Tuesday. The goal's cached `saved` moves
 * by the difference only, in the same transaction, so an edit can never leave the
 * total out of step with the entries that make it up.
 */
export async function updateContribution(
  id: ID,
  patch: Partial<Pick<GoalContribution, 'amount' | 'account_id' | 'investment_id' | 'note' | 'date'>>
): Promise<void> {
  await db.transaction('rw', db.goals, db.goal_contributions, db.sync_queue, async () => {
    const current = await db.goal_contributions.get(id);
    if (!current || current.deleted_at) return;

    await db.goal_contributions.update(id, { ...patch, updated_at: now(), synced_at: null });
    await enqueue('goal_contributions', 'upsert', id);

    const delta = (patch.amount ?? current.amount) - current.amount;
    if (delta === 0) return;
    const goal = await db.goals.get(current.goal_id);
    if (goal && !goal.deleted_at) {
      await db.goals.update(goal.id, {
        saved: Math.max(0, goal.saved + delta),
        updated_at: now(),
        synced_at: null,
      });
      await enqueue('goals', 'upsert', goal.id);
    }
  });
}

/** Remove a single contribution and unwind its effect on the goal's saved total. */
export async function deleteContribution(id: ID): Promise<void> {
  await db.transaction('rw', db.goals, db.goal_contributions, db.sync_queue, async () => {
    const c = await db.goal_contributions.get(id);
    if (!c || c.deleted_at) return;
    await db.goal_contributions.update(id, { deleted_at: now(), updated_at: now(), synced_at: null });
    await enqueue('goal_contributions', 'delete', id);

    const goal = await db.goals.get(c.goal_id);
    if (goal && !goal.deleted_at) {
      await db.goals.update(goal.id, {
        saved: Math.max(0, goal.saved - c.amount),
        updated_at: now(),
        synced_at: null,
      });
      await enqueue('goals', 'upsert', goal.id);
    }
  });
}

// --- investments ----------------------------------------------------------

export type NewInvestment = Pick<Investment, 'name' | 'kind' | 'invested' | 'current_value' | 'color'> &
  Partial<Pick<Investment, 'interest_rate' | 'maturity_date' | 'account_id' | 'note'>>;

export async function createInvestment(input: NewInvestment): Promise<Investment> {
  const investment: Investment = {
    id: newId(),
    interest_rate: null,
    maturity_date: null,
    account_id: null,
    note: '',
    valued_at: now(),
    archived: false,
    ...input,
    ...freshMeta(),
  };
  await db.investments.put(investment);
  await enqueue('investments', 'upsert', investment.id);
  return investment;
}

export async function updateInvestment(id: ID, patch: Partial<Investment>): Promise<void> {
  // Any change to current_value refreshes the "as of" stamp unless the caller set one.
  const bumped =
    patch.current_value !== undefined && patch.valued_at === undefined
      ? { ...patch, valued_at: now() }
      : patch;
  await db.investments.update(id, { ...bumped, updated_at: now(), synced_at: null });
  await enqueue('investments', 'upsert', id);
}

export async function deleteInvestment(id: ID): Promise<void> {
  await db.investments.update(id, { deleted_at: now(), updated_at: now(), synced_at: null });
  await enqueue('investments', 'delete', id);
}

// --- recurring rules ------------------------------------------------------

export async function createRecurringRule(
  input: Pick<
    RecurringRule,
    'merchant' | 'amount' | 'category_id' | 'account_id' | 'cadence' | 'anchor' | 'next_due'
  > &
    Partial<Pick<RecurringRule, 'confirmed' | 'active' | 'interval'>>
): Promise<RecurringRule> {
  const rule: RecurringRule = {
    id: newId(),
    confirmed: false,
    active: true,
    interval: 1,
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

/**
 * Advance any active rule whose due date has already gone by to its next real
 * occurrence. Nothing else moves `next_due` after a rule is created, so a
 * monthly rent set up in March still read "next 3 Mar" in July, and the same
 * stale date fed "bills to come". Runs once per boot behind the vault.
 *
 * Only rules that actually move are written, so a boot with nothing overdue
 * queues no sync at all.
 */
export async function rollOverdueRecurringRules(ref = new Date()): Promise<void> {
  const rules = await db.recurring_rules.toArray();
  const today = midnight(ref);
  for (const r of rules) {
    if (r.deleted_at || !r.active || r.next_due >= today) continue;
    const next = rollForward(r.next_due, r.cadence, r.interval, ref, r.anchor);
    if (next === r.next_due) continue;
    await updateRecurringRule(r.id, { next_due: next });
  }
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

/**
 * Backfill defaults that were added to the app *after* this account was first
 * seeded (e.g. "Education & learning" in v0.6.0), so returning users get them
 * without a manual "restore defaults". Runs once per boot behind the vault.
 *
 * The check is against *all* category rows including tombstones, keyed by name:
 * a default the user has ever created — even one they later deleted — is left
 * alone, so this never resurrects something removed on purpose. It only adds a
 * brand-new default that has no row at all. It's a plain local write that syncs
 * like any other, so it needs no sync to appear and can be deleted afterwards.
 */
export async function backfillNewDefaultCategories(): Promise<void> {
  const all = await db.categories.toArray();
  if (all.length === 0) return; // fresh install: seedDefaults owns this
  const known = new Set(all.map((c) => c.name)); // includes tombstoned names
  let order = all.filter((c) => !c.deleted_at).length;
  for (const c of DEFAULT_CATEGORIES) {
    if (known.has(c.name)) continue;
    await createCategory({ ...c, order: order++ });
  }
}

// --- prefs ----------------------------------------------------------------

/**
 * The singleton prefs row. `records.id` is a uuid column, so this has to be a
 * real UUID rather than a slug like "prefs" — it's a fixed one, so every device
 * writes and reads the same row and last-write-wins does the rest.
 */
export const PREFS_ID: ID = '00000000-0000-4000-8000-000000000001';

/** Read account prefs, or null if this device has never seen or pulled them. */
export async function getPrefs(): Promise<Prefs | null> {
  const row = await db.prefs.get(PREFS_ID);
  return row && !row.deleted_at ? row : null;
}

/**
 * Patch account prefs, creating the row on first write. Goes through the normal
 * queue, so it syncs encrypted like any other record.
 */
export async function updatePrefs(patch: Partial<Omit<Prefs, 'id' | keyof SyncMeta>>): Promise<void> {
  const existing = await db.prefs.get(PREFS_ID);
  const row: Prefs = {
    last_seen_version: null,
    ...existing,
    ...patch,
    id: PREFS_ID,
    updated_at: now(),
    deleted_at: null,
    synced_at: existing?.synced_at ?? null,
  };
  await db.prefs.put(row);
  await enqueue('prefs', 'upsert', PREFS_ID);
}
