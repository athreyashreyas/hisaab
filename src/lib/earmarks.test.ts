import { describe, expect, it } from 'vitest';
import { computeEarmarks } from './earmarks';
import { makeContribution, rupees } from './test-factories';
import type { ID } from '../types';

const ids = (...v: ID[]) => new Set<ID>(v);

const GOALS = ids('goal-1', 'goal-2');
const ACCOUNTS = ids('acc-1', 'acc-2');
const INVESTMENTS = ids('inv-1');

const compute = (contributions: Parameters<typeof computeEarmarks>[0]) =>
  computeEarmarks(contributions, GOALS, ACCOUNTS, INVESTMENTS);

describe('computeEarmarks', () => {
  it('reserves nothing when there are no contributions', () => {
    const e = compute([]);
    expect(e.total).toBe(0);
    expect(e.fromAccounts).toBe(0);
    expect(e.fromInvestments).toBe(0);
    expect(e.byAccount.size).toBe(0);
    expect(e.byInvestment.size).toBe(0);
  });

  it('holds account money out per account and totals it', () => {
    const e = compute([
      makeContribution({ goal_id: 'goal-1', account_id: 'acc-1', amount: rupees(5_000) }),
      makeContribution({ goal_id: 'goal-1', account_id: 'acc-1', amount: rupees(2_000) }),
      makeContribution({ goal_id: 'goal-2', account_id: 'acc-2', amount: rupees(3_000) }),
    ]);
    expect(e.byAccount.get('acc-1')).toBe(rupees(7_000));
    expect(e.byAccount.get('acc-2')).toBe(rupees(3_000));
    expect(e.fromAccounts).toBe(rupees(10_000));
    expect(e.fromInvestments).toBe(0);
    expect(e.total).toBe(rupees(10_000));
  });

  it('keeps holdings on their own side of the ledger', () => {
    const e = compute([
      makeContribution({ goal_id: 'goal-1', account_id: 'acc-1', amount: rupees(5_000) }),
      makeContribution({ goal_id: 'goal-1', investment_id: 'inv-1', amount: rupees(2_00_000) }),
    ]);
    expect(e.fromAccounts).toBe(rupees(5_000));
    expect(e.fromInvestments).toBe(rupees(2_00_000));
    expect(e.total).toBe(rupees(2_05_000));
    expect(e.byAccount.has('inv-1')).toBe(false);
  });

  it('nets a withdrawal off within its own source', () => {
    const e = compute([
      makeContribution({ goal_id: 'goal-1', account_id: 'acc-1', amount: rupees(5_000) }),
      makeContribution({ goal_id: 'goal-1', account_id: 'acc-1', amount: rupees(-2_000) }),
    ]);
    expect(e.byAccount.get('acc-1')).toBe(rupees(3_000));
    expect(e.total).toBe(rupees(3_000));
  });

  it('floors a source at zero when more came back out than ever went in', () => {
    // Over-withdrawing is a correction, not a negative claim on the balance.
    const e = compute([
      makeContribution({ goal_id: 'goal-1', account_id: 'acc-1', amount: rupees(1_000) }),
      makeContribution({ goal_id: 'goal-1', account_id: 'acc-1', amount: rupees(-4_000) }),
    ]);
    expect(e.byAccount.get('acc-1')).toBe(0);
    expect(e.fromAccounts).toBe(0);
    expect(e.total).toBe(0);
  });

  it('does not let one over-withdrawn source eat into another', () => {
    const e = compute([
      makeContribution({ goal_id: 'goal-1', account_id: 'acc-1', amount: rupees(-4_000) }),
      makeContribution({ goal_id: 'goal-2', account_id: 'acc-2', amount: rupees(6_000) }),
    ]);
    expect(e.byAccount.get('acc-1')).toBe(0);
    expect(e.byAccount.get('acc-2')).toBe(rupees(6_000));
    expect(e.fromAccounts).toBe(rupees(6_000));
  });

  it('releases the money when the goal is gone', () => {
    // This is what makes deleting a goal give the money back.
    const e = compute([
      makeContribution({ goal_id: 'deleted-goal', account_id: 'acc-1', amount: rupees(5_000) }),
    ]);
    expect(e.total).toBe(0);
  });

  it('releases the money when the source has left the picture', () => {
    // Deleting a mutual fund that was funding a goal used to take its value out
    // of what you hold while leaving the goal's claim on it standing, so "free
    // to use" quietly dropped by the earmark and never recovered.
    const e = compute([
      makeContribution({ goal_id: 'goal-1', investment_id: 'sold-fund', amount: rupees(2_00_000) }),
      makeContribution({ goal_id: 'goal-1', account_id: 'closed-acc', amount: rupees(5_000) }),
    ]);
    expect(e.total).toBe(0);
    expect(e.byInvestment.size).toBe(0);
    expect(e.byAccount.size).toBe(0);
  });

  it('skips a tombstoned contribution', () => {
    const e = compute([
      makeContribution({
        goal_id: 'goal-1',
        account_id: 'acc-1',
        amount: rupees(5_000),
        deleted_at: Date.now(),
      }),
    ]);
    expect(e.total).toBe(0);
  });

  it('claims nothing for an unattributed contribution', () => {
    // Money set aside without naming a source moves no balance anywhere.
    const e = compute([
      makeContribution({ goal_id: 'goal-1', account_id: null, investment_id: null, amount: rupees(5_000) }),
    ]);
    expect(e.total).toBe(0);
  });

  it('prefers the account when a contribution somehow names both', () => {
    // At most one should be set; if both are, the account wins and the holding
    // is left alone rather than the rupee being claimed twice.
    const e = compute([
      makeContribution({
        goal_id: 'goal-1',
        account_id: 'acc-1',
        investment_id: 'inv-1',
        amount: rupees(5_000),
      }),
    ]);
    expect(e.byAccount.get('acc-1')).toBe(rupees(5_000));
    expect(e.byInvestment.size).toBe(0);
    expect(e.total).toBe(rupees(5_000));
  });

  it('falls through to the holding when the named account is not live', () => {
    const e = compute([
      makeContribution({
        goal_id: 'goal-1',
        account_id: 'closed-acc',
        investment_id: 'inv-1',
        amount: rupees(5_000),
      }),
    ]);
    expect(e.byInvestment.get('inv-1')).toBe(rupees(5_000));
    expect(e.total).toBe(rupees(5_000));
  });

  it('always has its totals equal the sum of its parts', () => {
    // The four figures that depend on this rule stop adding up on screen the
    // moment the per-source map and the totals disagree.
    const e = compute([
      makeContribution({ goal_id: 'goal-1', account_id: 'acc-1', amount: rupees(5_000) }),
      makeContribution({ goal_id: 'goal-2', account_id: 'acc-2', amount: rupees(-9_000) }),
      makeContribution({ goal_id: 'goal-1', investment_id: 'inv-1', amount: rupees(2_00_000) }),
    ]);
    const sum = (m: Map<ID, number>) => [...m.values()].reduce((a, b) => a + b, 0);
    expect(sum(e.byAccount)).toBe(e.fromAccounts);
    expect(sum(e.byInvestment)).toBe(e.fromInvestments);
    expect(e.total).toBe(e.fromAccounts + e.fromInvestments);
  });
});
