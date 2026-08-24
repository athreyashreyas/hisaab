import { describe, expect, it } from 'vitest';
import { categoryBreakdown, categoryPace, safeToSpend } from './budget';
import { makeRule, makeTransaction, rupees } from './test-factories';
import { monthBounds } from './dates';

const on = (iso: string) => new Date(`${iso}T00:00:00`).getTime();
const at = (iso: string) => new Date(`${iso}T00:00:00`);

// A fixed "today" in the middle of a 31-day month, so nothing here depends on
// when the suite happens to run. 15 March 2026 is a Sunday.
const TODAY = at('2026-03-15');
const MARCH = monthBounds(TODAY);

describe('safeToSpend', () => {
  it('is zero across the board for a month with nothing in it', () => {
    const s = safeToSpend([], [], 0, TODAY);
    expect(s).toMatchObject({ amount: 0, income: 0, spentSoFar: 0, billsRemaining: 0 });
  });

  it('subtracts spending and set-asides from the month income', () => {
    const s = safeToSpend(
      [
        makeTransaction({ type: 'income', amount: rupees(80_000), date: on('2026-03-01') }),
        makeTransaction({ type: 'expense', amount: rupees(12_000), date: on('2026-03-05') }),
        makeTransaction({ type: 'expense', amount: rupees(3_000), date: on('2026-03-12') }),
      ],
      [],
      rupees(10_000),
      TODAY
    );
    expect(s.income).toBe(rupees(80_000));
    expect(s.spentSoFar).toBe(rupees(15_000));
    expect(s.goalSetAside).toBe(rupees(10_000));
    expect(s.amount).toBe(rupees(55_000));
  });

  it('ignores anything outside the month, and any tombstone inside it', () => {
    const s = safeToSpend(
      [
        makeTransaction({ type: 'income', amount: rupees(80_000), date: on('2026-02-28') }),
        makeTransaction({ type: 'expense', amount: rupees(500), date: on('2026-04-01') }),
        makeTransaction({
          type: 'expense',
          amount: rupees(9_999),
          date: on('2026-03-05'),
          deleted_at: on('2026-03-06'),
        }),
      ],
      [],
      0,
      TODAY
    );
    expect(s.income).toBe(0);
    expect(s.spentSoFar).toBe(0);
  });

  it('counts a transfer as neither income nor spending', () => {
    // Moving your own money between accounts changes no totals.
    const s = safeToSpend(
      [makeTransaction({ type: 'transfer', amount: rupees(20_000), date: on('2026-03-05') })],
      [],
      0,
      TODAY
    );
    expect(s.income).toBe(0);
    expect(s.spentSoFar).toBe(0);
  });

  it('holds back a bill due later this month', () => {
    const s = safeToSpend(
      [makeTransaction({ type: 'income', amount: rupees(80_000), date: on('2026-03-01') })],
      [makeRule({ merchant: 'Rent', amount: rupees(25_000), next_due: on('2026-03-28') })],
      0,
      TODAY
    );
    expect(s.billsRemaining).toBe(rupees(25_000));
    expect(s.amount).toBe(rupees(55_000));
  });

  it('keeps holding back a bill whose date has passed but which nobody has paid', () => {
    // The rule has already rolled to April, so the occurrence that belongs to
    // March is the previous one. A bill due on the 3rd that nobody has paid is
    // still money owed on the 15th; dropping it would let safe-to-spend quietly
    // rise on the strength of an unpaid bill.
    const s = safeToSpend(
      [],
      [makeRule({ merchant: 'Rent', amount: rupees(25_000), next_due: on('2026-04-03'), anchor: 3 })],
      0,
      TODAY
    );
    expect(s.billsRemaining).toBe(rupees(25_000));
  });

  it('stops holding back a bill once a linked transaction settles it', () => {
    const rule = makeRule({ merchant: 'Rent', amount: rupees(25_000), next_due: on('2026-03-28') });
    const s = safeToSpend(
      [
        makeTransaction({
          type: 'expense',
          amount: rupees(25_000),
          date: on('2026-03-03'),
          recurring_id: rule.id,
          merchant: 'Anything at all',
        }),
      ],
      [rule],
      0,
      TODAY
    );
    expect(s.billsRemaining).toBe(0);
  });

  it('settles a bill that was simply typed in, by payee and account', () => {
    // Most real bills are never created through the "Repeat this" toggle, so
    // without this fallback "bills to come" kept subtracting rent for the whole
    // month after rent had been paid.
    const s = safeToSpend(
      [
        makeTransaction({
          type: 'expense',
          amount: rupees(25_000),
          date: on('2026-03-03'),
          merchant: '  rent ',
          account_id: 'acc-1',
        }),
      ],
      [
        makeRule({
          merchant: 'Rent',
          amount: rupees(25_000),
          account_id: 'acc-1',
          next_due: on('2026-03-28'),
        }),
      ],
      0,
      TODAY
    );
    expect(s.billsRemaining).toBe(0);
  });

  it('does not let a payment from another account settle the bill', () => {
    const s = safeToSpend(
      [
        makeTransaction({
          type: 'expense',
          amount: rupees(25_000),
          date: on('2026-03-03'),
          merchant: 'Rent',
          account_id: 'acc-2',
        }),
      ],
      [makeRule({ merchant: 'Rent', account_id: 'acc-1', next_due: on('2026-03-28') })],
      0,
      TODAY
    );
    expect(s.billsRemaining).toBe(rupees(25_000));
  });

  it('ignores rules that are inactive, unconfirmed or deleted', () => {
    const s = safeToSpend(
      [],
      [
        makeRule({ amount: rupees(1_000), next_due: on('2026-03-28'), active: false }),
        makeRule({ amount: rupees(2_000), next_due: on('2026-03-28'), confirmed: false }),
        makeRule({ amount: rupees(4_000), next_due: on('2026-03-28'), deleted_at: on('2026-03-01') }),
      ],
      0,
      TODAY
    );
    expect(s.billsRemaining).toBe(0);
  });

  it('leaves a bill out when neither its next nor its previous hit falls in the month', () => {
    // A yearly rule next due in April last landed in April 2025, so March owes
    // nothing. (A monthly rule is never in this position: whichever side of the
    // month end its next_due sits, one of its two occurrences is in March.)
    const s = safeToSpend(
      [],
      [
        makeRule({
          cadence: 'yearly',
          amount: rupees(25_000),
          next_due: on('2026-04-15'),
          anchor: 15,
        }),
      ],
      0,
      TODAY
    );
    expect(s.billsRemaining).toBe(0);
  });

  it('still counts a monthly bill anchored later in the month that has rolled past it', () => {
    // next_due has moved on to April, so March's occurrence is the previous one
    // — and it is unsettled, so it is still owed.
    const s = safeToSpend(
      [],
      [makeRule({ amount: rupees(25_000), next_due: on('2026-04-15'), anchor: 15 })],
      0,
      TODAY
    );
    expect(s.billsRemaining).toBe(rupees(25_000));
  });

  it('counts a daily bill once per remaining day, since one payment cannot zero it', () => {
    // 15 March through 31 March inclusive is 17 days.
    const s = safeToSpend(
      [],
      [makeRule({ cadence: 'daily', amount: rupees(100), next_due: on('2026-03-15') })],
      0,
      TODAY
    );
    expect(s.billsRemaining).toBe(rupees(1_700));
  });

  it('spaces an every-N-days bill across what is left of the month', () => {
    // 17 days remaining, every 3 days → 6 hits.
    const s = safeToSpend(
      [],
      [makeRule({ cadence: 'daily', interval: 3, amount: rupees(100), next_due: on('2026-03-15') })],
      0,
      TODAY
    );
    expect(s.billsRemaining).toBe(rupees(600));
  });

  it('does not count a daily bill whose next hit is past the month end', () => {
    const s = safeToSpend(
      [],
      [makeRule({ cadence: 'daily', amount: rupees(100), next_due: on('2026-04-02') })],
      0,
      TODAY
    );
    expect(s.billsRemaining).toBe(0);
  });

  it('starts a stale daily bill from today rather than from its overdue date', () => {
    const s = safeToSpend(
      [],
      [makeRule({ cadence: 'daily', amount: rupees(100), next_due: on('2026-01-01') })],
      0,
      TODAY
    );
    expect(s.billsRemaining).toBe(rupees(1_700));
  });

  it('splits what is left across the days remaining, today included', () => {
    const s = safeToSpend(
      [makeTransaction({ type: 'income', amount: rupees(17_000), date: on('2026-03-01') })],
      [],
      0,
      TODAY
    );
    expect(s.amount).toBe(rupees(17_000));
    expect(s.perDayRemaining).toBe(rupees(1_000)); // 17 days left including today
  });

  it('never offers a negative daily allowance when the month is overspent', () => {
    const s = safeToSpend(
      [makeTransaction({ type: 'expense', amount: rupees(5_000), date: on('2026-03-02') })],
      [],
      0,
      TODAY
    );
    expect(s.amount).toBe(rupees(-5_000));
    expect(s.perDayRemaining).toBe(0);
  });

  it('divides by one, not zero, on the last day of the month', () => {
    const s = safeToSpend(
      [makeTransaction({ type: 'income', amount: rupees(900), date: on('2026-03-01') })],
      [],
      0,
      at('2026-03-31')
    );
    expect(s.perDayRemaining).toBe(rupees(900));
  });
});

describe('categoryPace', () => {
  it('reads as over the moment the budget is exhausted', () => {
    const pace = categoryPace('cat-1', rupees(5_000), rupees(5_000), TODAY);
    expect(pace.status).toBe('over');
    expect(pace.used).toBe(1);
  });

  it('warns when spending runs more than 10 points ahead of the month', () => {
    // Day 18 of 31 is 58% of the month; 90% of the budget is a warning even
    // though it is not "over" yet.
    const pace = categoryPace('cat-1', rupees(5_000), rupees(4_500), at('2026-03-18'));
    expect(pace.status).toBe('watch');
    expect(pace.monthElapsed).toBeCloseTo(18 / 31, 10);
  });

  it('is content while spending tracks the month, within the slack', () => {
    const level = categoryPace('cat-1', rupees(5_000), rupees(2_400), TODAY);
    expect(level.status).toBe('ok');
  });

  it('holds its warning until spending is more than 10 points ahead', () => {
    // Day 15 of 31 is 48.4% of the month, so the line sits at 58.4% of budget.
    const budget = rupees(10_000);
    const threshold = budget * (15 / 31 + 0.1);
    expect(categoryPace('cat-1', budget, Math.floor(threshold), TODAY).status).toBe('ok');
    expect(categoryPace('cat-1', budget, Math.ceil(threshold) + 1, TODAY).status).toBe('watch');
  });

  it('treats an untracked category as having used nothing', () => {
    // No budget means no pace to be ahead of, however much was spent.
    const pace = categoryPace('cat-1', 0, rupees(9_000), TODAY);
    expect(pace.used).toBe(0);
    expect(pace.status).toBe('ok');
  });

  it('carries its inputs back out untouched, for the row that renders it', () => {
    const pace = categoryPace('cat-7', rupees(5_000), rupees(1_000), TODAY);
    expect(pace).toMatchObject({
      categoryId: 'cat-7',
      budget: rupees(5_000),
      spent: rupees(1_000),
    });
  });
});

describe('categoryBreakdown', () => {
  const spend = (categoryId: string | null, amount: number, iso = '2026-03-10') =>
    makeTransaction({ type: 'expense', category_id: categoryId, amount, date: on(iso) });

  it('has nothing to say about a window with no spending', () => {
    expect(categoryBreakdown([], MARCH.start, MARCH.end)).toEqual([]);
  });

  it('totals per category and orders largest first', () => {
    const slices = categoryBreakdown(
      [
        spend('food', rupees(2_000)),
        spend('food', rupees(1_000)),
        spend('rent', rupees(25_000)),
        spend('fuel', rupees(500)),
      ],
      MARCH.start,
      MARCH.end
    );
    expect(slices.map((s) => s.categoryId)).toEqual(['rent', 'food', 'fuel']);
    expect(slices[1].total).toBe(rupees(3_000));
  });

  it('gives each slice its share of the window total', () => {
    const slices = categoryBreakdown(
      [spend('food', rupees(7_500)), spend('rent', rupees(2_500))],
      MARCH.start,
      MARCH.end
    );
    expect(slices[0].share).toBeCloseTo(0.75, 10);
    expect(slices[1].share).toBeCloseTo(0.25, 10);
    expect(slices.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1, 10);
  });

  it('counts only live expenses inside the half-open window', () => {
    const slices = categoryBreakdown(
      [
        spend('food', rupees(1_000), '2026-02-28'),
        spend('food', rupees(1_000), '2026-04-01'),
        makeTransaction({ type: 'income', category_id: 'food', amount: rupees(9_000), date: on('2026-03-10') }),
        { ...spend('food', rupees(1_000)), deleted_at: on('2026-03-11') },
        spend('food', rupees(400)),
      ],
      MARCH.start,
      MARCH.end
    );
    expect(slices).toEqual([{ categoryId: 'food', total: rupees(400), share: 1 }]);
  });

  it('buckets an uncategorised spend under null', () => {
    const slices = categoryBreakdown([spend(null, rupees(600))], MARCH.start, MARCH.end);
    expect(slices[0].categoryId).toBeNull();
  });

  it('folds a deleted category into the same uncategorised bucket', () => {
    // Without this, removing a category left its history as a second nameless
    // slice sitting alongside the real one, both rendering as "Uncategorised".
    const slices = categoryBreakdown(
      [spend('gone', rupees(1_000)), spend(null, rupees(500)), spend('food', rupees(2_000))],
      MARCH.start,
      MARCH.end,
      new Set(['food'])
    );
    expect(slices).toEqual([
      { categoryId: 'food', total: rupees(2_000), share: 2000 / 3500 },
      { categoryId: null, total: rupees(1_500), share: 1500 / 3500 },
    ]);
  });

  it('leaves every category standing when no live set is given', () => {
    const slices = categoryBreakdown(
      [spend('gone', rupees(1_000)), spend(null, rupees(500))],
      MARCH.start,
      MARCH.end
    );
    expect(slices.map((s) => s.categoryId)).toEqual(['gone', null]);
  });
});
