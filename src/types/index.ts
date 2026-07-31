/**
 * Hisaab data model.
 *
 * Every record carries sync bookkeeping (updated_at, deleted_at, synced_at) so
 * the local-first engine can reconcile against the encrypted cloud backup with
 * last-write-wins on updated_at. `deleted_at` is a tombstone (soft delete) so a
 * deletion propagates instead of a row silently reappearing from another device.
 *
 * Amounts are stored as integer paise (₹1 = 100) to avoid float drift. Format
 * for display with formatINR() in lib/money.
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
  merchant: string; // "Third Wave Coffee", "Rent", free text
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
  name: string; // "Kerala trip", "Rainy-day fund"
  target: number; // paise
  saved: number; // paise contributed so far
  /** Optional deadline, epoch ms. Drives the "on track / behind" projection. */
  target_date: number | null;
  color: string;
  icon: string;
  archived: boolean;

  /**
   * Where this goal's money comes from by default, pre-selected when adding a
   * contribution. Exactly one of the two is set, or neither for a goal whose
   * money isn't attributed anywhere. Individual contributions can still name a
   * different source, so a goal funded mostly from savings can take a one-off
   * top-up from a mutual fund without changing its default.
   */
  funding_account_id: ID | null;
  funding_investment_id: ID | null;

  /**
   * The contribution schedule: "₹5,000 every month", "₹2,000 every 2 weeks".
   * A plan is what makes "am I behind?" answerable in payments rather than only
   * in rupees, and what a missed payment is measured against. null = no plan,
   * in which case pace falls back to the target date if there is one.
   */
  plan_amount: number | null; // paise per period
  plan_cadence: Cadence | null;
  plan_interval: number; // every N periods, >= 1
  /** First payment date; the whole schedule is counted from here. */
  plan_start: number | null;
}

export interface GoalContribution extends SyncMeta {
  id: ID;
  goal_id: ID;
  amount: number; // paise, can be negative for a withdrawal
  /**
   * The account the money was set aside from (or returned to, on a withdrawal).
   * Contributions earmark money out of that account's available balance, so two
   * different accounts can each fund a slice of the same goal. null = the money
   * came from somewhere else (see investment_id) or is unattributed, in which
   * case no account balance moves.
   */
  account_id: ID | null;
  /**
   * The holding the money is earmarked out of instead, when a goal is being
   * funded from investments rather than cash — "₹2L of the house fund is sitting
   * in my flexi-cap". Earmarks part of that holding's current value the same way
   * an account contribution earmarks part of a balance, so the same rupee is
   * never counted as both invested-and-free and saved-for-a-goal.
   *
   * At most one of account_id / investment_id is set.
   */
  investment_id: ID | null;
  date: number;
  note: string;
}

// --- investments ----------------------------------------------------------

export type InvestmentKind = 'stock' | 'mutual_fund' | 'fd' | 'other';

/**
 * A holding in the portfolio. Hisaab is local-first and end-to-end encrypted
 * with no outbound network calls, so there's no live market feed: `current_value`
 * is whatever the user last entered, and returns are computed against `invested`.
 * FDs can carry an interest rate and a maturity date for the maturity view.
 */
export interface Investment extends SyncMeta {
  id: ID;
  name: string; // "Reliance", "Parag Parikh Flexi Cap", "HDFC 1-yr FD"
  kind: InvestmentKind;
  invested: number; // paise put in (cost basis)
  current_value: number; // paise, latest value the user entered
  /** FDs: annual interest rate percent (e.g. 7.1). null when not applicable. */
  interest_rate: number | null;
  /** FDs: maturity date, epoch ms. null when not applicable. */
  maturity_date: number | null;
  /** Optional account this was funded from, for reference only. */
  account_id: ID | null;
  note: string;
  color: string; // token from ACCENT_PALETTE
  /** When current_value was last updated, epoch ms. */
  valued_at: number;
  archived: boolean;
}

// --- recurring detection --------------------------------------------------

export type Cadence = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringRule extends SyncMeta {
  id: ID;
  merchant: string;
  amount: number; // paise, expected
  category_id: ID | null;
  account_id: ID;
  cadence: Cadence;
  /**
   * How many cadence units between hits: 1 = every day/week/month/year, 2 = every
   * other, and so on. Lets a rule read as "every 2 weeks" or "every 3 months"
   * instead of only the fixed cadences. Legacy rows without it are treated as 1.
   */
  interval: number;
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
  | 'investments'
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
