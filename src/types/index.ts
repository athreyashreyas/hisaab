/**
 * Hisaab data model.
 *
 * Every record carries sync bookkeeping (updated_at, deleted_at, synced_at) so
 * the local-first engine can reconcile against the encrypted cloud backup with
 * last-write-wins on updated_at. `deleted_at` is a tombstone (soft delete) so a
 * deletion propagates instead of a row silently reappearing from another device.
 *
 * Amounts are stored as integer paise (₹1 = 100) to avoid float drift. Format
 * for display with formatINR() in lib/calculations.
 */

export type ID = string; // uuid v4, generated client-side

export interface SyncMeta {
  updated_at: number; // epoch ms, bumped on every write
  deleted_at: number | null; // tombstone
  synced_at: number | null; // last time this row was confirmed in the cloud
}

// --- accounts -------------------------------------------------------------

export type AccountKind = 'bank' | 'cash' | 'card' | 'wallet';

export interface Account extends SyncMeta {
  id: ID;
  name: string; // "HDFC Salary", "Cash", "Amazon Pay"
  kind: AccountKind;
  /** Opening balance in paise, the starting point balances are computed from. */
  opening_balance: number;
  color: string; // token key from lib/categories ACCENT_PALETTE
  archived: boolean;
}

// --- categories -----------------------------------------------------------

export interface Category extends SyncMeta {
  id: ID;
  name: string;
  /** lucide-react icon name, e.g. "coffee", "bus", "home". */
  icon: string;
  color: string; // hex from lib/categories CATEGORY_PALETTE
  /** Optional monthly budget in paise. null = untracked. */
  monthly_budget: number | null;
  /** Sort order in pickers and charts. */
  order: number;
  /** Seeded defaults are marked so a reset can restore them. */
  is_default: boolean;
}

// --- transactions ---------------------------------------------------------

export type TxnType = 'expense' | 'income' | 'transfer';

export type TxnSource = 'manual' | 'email' | 'recurring'; // 'email' reserved for future auto-capture

export interface Transaction extends SyncMeta {
  id: ID;
  type: TxnType;
  /** Positive integer paise. Sign is implied by `type`, never stored negative. */
  amount: number;
  account_id: ID;
  /** For transfers, the destination account. */
  to_account_id: ID | null;
  category_id: ID | null; // null for transfers
  merchant: string; // "Blue Tokai", "Rent", free text
  note: string;
  /** Transaction date (not entry date), local midnight epoch ms. */
  date: number;
  source: TxnSource;
  /** If spawned by a recurring rule, links back to it. */
  recurring_id: ID | null;
  /** Optional split: portions of this txn attributed to people. */
  splits: Split[] | null;
}

export interface Split {
  who: string; // "Noor", "Me"
  amount: number; // paise
  settled: boolean;
}

// --- goals ----------------------------------------------------------------

export interface Goal extends SyncMeta {
  id: ID;
  name: string; // "Leather bag for Noor", "Chennai–Delhi ride"
  target: number; // paise
  saved: number; // paise contributed so far
  /** Optional deadline, epoch ms. Drives the "on track / behind" projection. */
  target_date: number | null;
  color: string;
  icon: string;
  archived: boolean;
}

export interface GoalContribution extends SyncMeta {
  id: ID;
  goal_id: ID;
  amount: number; // paise, can be negative for a withdrawal
  date: number;
  note: string;
}

// --- recurring detection --------------------------------------------------

export type Cadence = 'weekly' | 'monthly' | 'yearly';

export interface RecurringRule extends SyncMeta {
  id: ID;
  merchant: string;
  amount: number; // paise, expected
  category_id: ID | null;
  account_id: ID;
  cadence: Cadence;
  /** Day-of-month (monthly), day-of-week (weekly), or day-of-year anchor. */
  anchor: number;
  next_due: number; // epoch ms
  /** True once the user confirms a detected pattern; detected-but-unconfirmed
   *  rules surface as a suggestion the user accepts or dismisses. */
  confirmed: boolean;
  active: boolean;
}

// --- prefs ----------------------------------------------------------------

/**
 * Account-level preferences that ride the normal encrypted sync path, so they
 * follow you across devices without the server learning anything. A singleton:
 * exactly one row, at PREFS_ID.
 *
 * It syncs as a `records` row like everything else, which is why this is a
 * proper table rather than a plaintext column somewhere — the server holds
 * ciphertext and timestamps, and prefs are no exception.
 */
export interface Prefs extends SyncMeta {
  id: ID;
  /** Newest app version whose "What's new" this account has already seen. */
  last_seen_version: string | null;
}

// --- sync queue -----------------------------------------------------------

export type SyncTable =
  | 'accounts'
  | 'categories'
  | 'transactions'
  | 'goals'
  | 'goal_contributions'
  | 'recurring_rules'
  | 'prefs';

export type SyncOp = 'upsert' | 'delete';

export interface SyncQueueItem {
  id?: number; // auto-increment
  table_name: SyncTable;
  operation: SyncOp;
  record_id: ID;
  created_at: number;
  retry_count: number;
}
