import Dexie, { type EntityTable } from 'dexie';
import type {
  Account,
  Category,
  Transaction,
  Goal,
  GoalContribution,
  RecurringRule,
  SyncQueueItem,
} from '../types';

/**
 * Local-first store. Holds PLAINTEXT records (the device is the trust boundary)
 * for instant offline queries and charting. Sync seals each record with the DEK
 * before it leaves the device — see lib/crypto and lib/sync. Same shape and
 * conventions as Attend's AttendDB so the suite's sync engine is portable.
 */
class HisaabDB extends Dexie {
  accounts!: EntityTable<Account, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  goals!: EntityTable<Goal, 'id'>;
  goal_contributions!: EntityTable<GoalContribution, 'id'>;
  recurring_rules!: EntityTable<RecurringRule, 'id'>;
  sync_queue!: EntityTable<SyncQueueItem, 'id'>;

  constructor() {
    super('HisaabDB');
    this.version(1).stores({
      accounts: 'id, kind, archived, deleted_at, synced_at',
      categories: 'id, order, deleted_at, synced_at',
      // Compound [type+date] index powers the dashboard's month range scans.
      transactions:
        'id, type, account_id, category_id, date, [type+date], recurring_id, deleted_at, synced_at',
      goals: 'id, archived, target_date, deleted_at, synced_at',
      goal_contributions: 'id, goal_id, date, deleted_at, synced_at',
      recurring_rules: 'id, next_due, confirmed, active, deleted_at, synced_at',
      sync_queue: '++id, table_name, operation, record_id, created_at, retry_count',
    });
  }
}

export const db = new HisaabDB();

/** Wipe local data on sign-out or vault lock so another account can't read it. */
export async function clearLocalDb(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.accounts,
      db.categories,
      db.transactions,
      db.goals,
      db.goal_contributions,
      db.recurring_rules,
      db.sync_queue,
    ],
    async () => {
      await Promise.all([
        db.accounts.clear(),
        db.categories.clear(),
        db.transactions.clear(),
        db.goals.clear(),
        db.goal_contributions.clear(),
        db.recurring_rules.clear(),
        db.sync_queue.clear(),
      ]);
    }
  );
}
