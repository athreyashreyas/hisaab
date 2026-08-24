/**
 * Record builders for the suite.
 *
 * Every Hisaab record carries sync bookkeeping (updated_at / deleted_at /
 * synced_at) plus a dozen fields most tests have no opinion about. These
 * builders fill all of it with something plain and valid, so a test names only
 * the field it is actually about and anything it leaves out reads as
 * uninteresting rather than as an assertion nobody made.
 *
 * Amounts are paise everywhere, so `rupees()` is here too — a test that says
 * `rupees(1200)` is easier to check against the app than `120000`.
 */
import type {
  Account,
  Category,
  Goal,
  GoalContribution,
  ID,
  Investment,
  RecurringRule,
  Transaction,
} from '../types';

let counter = 0;
const nextId = (): ID => `id-${(counter += 1)}`;

/** Paise from rupees, so amounts in tests read the way they do on screen. */
export const rupees = (r: number): number => Math.round(r * 100);

/** Local midnight for a YYYY-MM-DD day, matching how transactions store dates. */
export const day = (iso: string): number => new Date(`${iso}T00:00:00`).getTime();

const sync = { updated_at: day('2026-01-01'), deleted_at: null, synced_at: null };

export function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: nextId(),
    name: 'HDFC Salary',
    kind: 'bank',
    opening_balance: rupees(10_000),
    color: '#1E7F75',
    archived: false,
    ...sync,
    ...overrides,
  };
}

export function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: nextId(),
    name: 'Food & dining',
    icon: 'utensils',
    color: '#C06E1C',
    monthly_budget: null,
    order: 0,
    is_default: true,
    ...sync,
    ...overrides,
  };
}

export function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: nextId(),
    type: 'expense',
    amount: rupees(500),
    account_id: 'acc-1',
    to_account_id: null,
    category_id: null,
    merchant: 'Third Wave Coffee',
    note: '',
    date: day('2026-03-10'),
    source: 'manual',
    recurring_id: null,
    splits: null,
    ...sync,
    ...overrides,
  };
}

export function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: nextId(),
    name: 'Kerala trip',
    target: rupees(100_000),
    saved: 0,
    target_date: null,
    color: '#1E7F75',
    icon: 'palmtree',
    archived: false,
    funding_account_id: null,
    funding_investment_id: null,
    plan_amount: null,
    plan_cadence: null,
    plan_interval: 1,
    plan_start: null,
    ...sync,
    ...overrides,
  };
}

export function makeContribution(overrides: Partial<GoalContribution> = {}): GoalContribution {
  return {
    id: nextId(),
    goal_id: 'goal-1',
    amount: rupees(5_000),
    account_id: null,
    investment_id: null,
    date: day('2026-03-01'),
    note: '',
    ...sync,
    ...overrides,
  };
}

export function makeInvestment(overrides: Partial<Investment> = {}): Investment {
  return {
    id: nextId(),
    name: 'Parag Parikh Flexi Cap',
    kind: 'mutual_fund',
    invested: rupees(100_000),
    current_value: rupees(120_000),
    interest_rate: null,
    maturity_date: null,
    account_id: null,
    note: '',
    color: '#2F7D62',
    valued_at: day('2026-03-01'),
    archived: false,
    ...sync,
    ...overrides,
  };
}

export function makeRule(overrides: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: nextId(),
    merchant: 'Rent',
    amount: rupees(25_000),
    category_id: null,
    account_id: 'acc-1',
    cadence: 'monthly',
    interval: 1,
    anchor: 1,
    next_due: day('2026-03-01'),
    confirmed: true,
    active: true,
    ...sync,
    ...overrides,
  };
}
