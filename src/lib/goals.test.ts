import { describe, expect, it } from 'vitest';
import {
  fundingBreakdown,
  goalPace,
  groupContributions,
  hasPlan,
  PACE_TONE,
  paymentsDueThrough,
  scheduleDate,
  suggestPlanAmount,
} from './goals';
import { makeAccount, makeContribution, makeGoal, makeInvestment, rupees } from './test-factories';
import { isoDay } from './dates';
import type { Account, ID, Investment } from '../types';

const on = (iso: string) => new Date(`${iso}T00:00:00`).getTime();
const at = (iso: string) => new Date(`${iso}T00:00:00`);

// A fixed "now" so nothing here depends on when the suite runs.
const TODAY = at('2026-03-15');

describe('scheduleDate', () => {
  it('is the start date itself at index 0, whatever the cadence', () => {
    for (const cadence of ['daily', 'weekly', 'monthly', 'yearly'] as const) {
      expect(scheduleDate(on('2026-03-10'), cadence, 1, 0)).toBe(on('2026-03-10'));
    }
  });

  it('walks each cadence out by index', () => {
    expect(isoDay(scheduleDate(on('2026-03-10'), 'daily', 1, 5))).toBe('2026-03-15');
    expect(isoDay(scheduleDate(on('2026-03-10'), 'weekly', 1, 2))).toBe('2026-03-24');
    expect(isoDay(scheduleDate(on('2026-03-10'), 'monthly', 1, 4))).toBe('2026-07-10');
    expect(isoDay(scheduleDate(on('2026-03-10'), 'yearly', 1, 2))).toBe('2028-03-10');
  });

  it('multiplies by the interval', () => {
    expect(isoDay(scheduleDate(on('2026-03-10'), 'weekly', 2, 3))).toBe('2026-04-21');
    expect(isoDay(scheduleDate(on('2026-01-10'), 'monthly', 3, 2))).toBe('2026-07-10');
  });

  it('clamps a 31st plan into short months without skidding into the next', () => {
    const start = on('2026-01-31');
    expect(isoDay(scheduleDate(start, 'monthly', 1, 1))).toBe('2026-02-28');
    expect(isoDay(scheduleDate(start, 'monthly', 1, 2))).toBe('2026-03-31');
    expect(isoDay(scheduleDate(start, 'monthly', 1, 3))).toBe('2026-04-30');
  });

  it('anchors every payment to the start date, so a clamp is never permanent', () => {
    // Stepping one month at a time would leave 31 Jan → 28 Feb → 28 Mar. Every
    // index is measured from the start, so March gets its 31st back.
    expect(isoDay(scheduleDate(on('2026-01-31'), 'monthly', 1, 2))).toBe('2026-03-31');
  });
});

describe('paymentsDueThrough', () => {
  const start = on('2026-01-10');

  it('counts nothing before the plan begins', () => {
    expect(paymentsDueThrough(start, 'monthly', 1, on('2026-01-09'))).toBe(0);
  });

  it('counts the first payment on the day the plan starts', () => {
    expect(paymentsDueThrough(start, 'monthly', 1, start)).toBe(1);
  });

  it('adds one per elapsed period', () => {
    expect(paymentsDueThrough(start, 'monthly', 1, on('2026-03-10'))).toBe(3);
    expect(paymentsDueThrough(start, 'monthly', 1, on('2026-03-09'))).toBe(2);
    expect(paymentsDueThrough(start, 'weekly', 1, on('2026-01-31'))).toBe(4);
    expect(paymentsDueThrough(start, 'daily', 1, on('2026-01-13'))).toBe(4);
  });

  it('divides by the interval for a custom cadence', () => {
    // Every 2 weeks from 10 Jan: 10, 24 Jan, 7, 21 Feb.
    expect(paymentsDueThrough(start, 'weekly', 2, on('2026-02-21'))).toBe(4);
    expect(paymentsDueThrough(start, 'weekly', 2, on('2026-02-20'))).toBe(3);
  });

  it('counts years by their anniversary, not by elapsed days', () => {
    expect(paymentsDueThrough(start, 'yearly', 1, on('2027-01-09'))).toBe(1);
    expect(paymentsDueThrough(start, 'yearly', 1, on('2027-01-10'))).toBe(2);
  });

  it('agrees with scheduleDate on where the boundary sits', () => {
    // The two are separate implementations of the same schedule; they have to
    // meet, or "next due" points at a payment the count says has already landed.
    // The day before a payment is the honest probe: the daily/weekly branch
    // rounds to whole days on purpose, so a millisecond earlier is still the
    // same day and would prove nothing.
    const dayBefore = (ts: number) => {
      const d = new Date(ts);
      d.setDate(d.getDate() - 1);
      return d.getTime();
    };
    for (const cadence of ['daily', 'weekly', 'monthly', 'yearly'] as const) {
      for (let i = 0; i < 6; i++) {
        const dueAt = scheduleDate(start, cadence, 2, i);
        expect(paymentsDueThrough(start, cadence, 2, dueAt)).toBe(i + 1);
        expect(paymentsDueThrough(start, cadence, 2, dayBefore(dueAt))).toBe(i);
      }
    }
  });

  it('survives a plan running for years without walking every step', () => {
    // Ten years of daily payments, counted arithmetically rather than stepped.
    expect(paymentsDueThrough(start, 'daily', 1, on('2036-01-10'))).toBe(3653);
  });
});

describe('hasPlan', () => {
  it('needs an amount, a cadence and a start date together', () => {
    expect(
      hasPlan(makeGoal({ plan_amount: rupees(5_000), plan_cadence: 'monthly', plan_start: on('2026-01-01') }))
    ).toBe(true);
    expect(hasPlan(makeGoal())).toBe(false);
    expect(hasPlan(makeGoal({ plan_amount: rupees(5_000), plan_cadence: 'monthly' }))).toBe(false);
    expect(hasPlan(makeGoal({ plan_amount: rupees(5_000), plan_start: on('2026-01-01') }))).toBe(false);
  });

  it('does not count a zero-rupee plan as a plan', () => {
    expect(
      hasPlan(makeGoal({ plan_amount: 0, plan_cadence: 'monthly', plan_start: on('2026-01-01') }))
    ).toBe(false);
  });
});

describe('suggestPlanAmount', () => {
  it('divides what is left across the payments up to the target date', () => {
    const suggestion = suggestPlanAmount(
      { target: rupees(60_000), saved: 0, target_date: on('2026-08-15') },
      'monthly',
      1,
      on('2026-03-15'),
      TODAY
    );
    // 15 March through 15 August inclusive is 6 payments.
    expect(suggestion).toBe(rupees(10_000));
  });

  it('counts only what is still to go, not the whole target', () => {
    const suggestion = suggestPlanAmount(
      { target: rupees(60_000), saved: rupees(30_000), target_date: on('2026-08-15') },
      'monthly',
      1,
      on('2026-03-15'),
      TODAY
    );
    expect(suggestion).toBe(rupees(5_000));
  });

  it('rounds up, so the plan actually reaches the target', () => {
    const suggestion = suggestPlanAmount(
      { target: 1000, saved: 0, target_date: on('2026-06-15') },
      'monthly',
      1,
      on('2026-03-15'),
      TODAY
    );
    expect(suggestion).toBe(250); // 1000 / 4, exact
    const uneven = suggestPlanAmount(
      { target: 1001, saved: 0, target_date: on('2026-06-15') },
      'monthly',
      1,
      on('2026-03-15'),
      TODAY
    );
    expect(uneven).toBe(251);
    expect((uneven as number) * 4).toBeGreaterThanOrEqual(1001);
  });

  it('has nothing to suggest without a date, or once the date has gone', () => {
    expect(
      suggestPlanAmount({ target: rupees(1_000), saved: 0, target_date: null }, 'monthly', 1, on('2026-03-15'), TODAY)
    ).toBeNull();
    expect(
      suggestPlanAmount(
        { target: rupees(1_000), saved: 0, target_date: on('2026-01-01') },
        'monthly',
        1,
        on('2026-01-01'),
        TODAY
      )
    ).toBeNull();
  });

  it('has nothing to suggest for a goal already met', () => {
    expect(
      suggestPlanAmount(
        { target: rupees(1_000), saved: rupees(1_000), target_date: on('2026-08-15') },
        'monthly',
        1,
        on('2026-03-15'),
        TODAY
      )
    ).toBeNull();
  });

  it('has nothing to suggest when the plan would start after the date', () => {
    expect(
      suggestPlanAmount(
        { target: rupees(1_000), saved: 0, target_date: on('2026-04-01') },
        'monthly',
        1,
        on('2026-05-01'),
        TODAY
      )
    ).toBeNull();
  });
});

describe('goalPace — a goal with no plan and no date', () => {
  it('says so rather than inventing a verdict', () => {
    // A brand-new goal used to read "Behind" the moment it was created, which
    // was both wrong and discouraging.
    const pace = goalPace(makeGoal(), [], TODAY);
    expect(pace.state).toBe('unplanned');
    expect(pace.requiredPerMonth).toBeNull();
    expect(pace.dueThisMonth).toBe(0);
    expect(pace.dueNextMonth).toBe(0);
    expect(pace.drift).toBe(0);
  });

  it('still reports progress and the run rate it can observe', () => {
    const goal = makeGoal({ target: rupees(1_00_000), saved: rupees(25_000) });
    const pace = goalPace(
      goal,
      [
        makeContribution({ amount: rupees(15_000), date: on('2026-02-01') }),
        makeContribution({ amount: rupees(10_000), date: on('2026-03-01') }),
      ],
      TODAY
    );
    expect(pace.progress).toBeCloseTo(0.25, 10);
    expect(pace.remaining).toBe(rupees(75_000));
    expect(pace.ratePerMonth).toBe(Math.round(rupees(25_000) / 3));
    expect(pace.addedThisMonth).toBe(rupees(10_000));
  });
});

describe('goalPace — a goal that is met', () => {
  it('reads as reached even when the plan or the date says otherwise', () => {
    // Reached wins over everything: a met goal is never "behind".
    const goal = makeGoal({
      target: rupees(1_00_000),
      saved: rupees(1_00_000),
      target_date: on('2026-01-01'),
      plan_amount: rupees(50_000),
      plan_cadence: 'monthly',
      plan_start: on('2025-01-01'),
    });
    const pace = goalPace(goal, [], TODAY);
    expect(pace.state).toBe('reached');
    expect(pace.progress).toBe(1);
    expect(pace.remaining).toBe(0);
    expect(pace.dueThisMonth).toBe(0);
    expect(pace.targetDatePassed).toBe(false);
  });

  it('caps progress at 1 when the target is overshot', () => {
    const pace = goalPace(
      makeGoal({ target: rupees(1_00_000), saved: rupees(1_50_000) }),
      [],
      TODAY
    );
    expect(pace.progress).toBe(1);
    expect(pace.remaining).toBe(0);
  });

  it('does not divide by a zero target', () => {
    expect(goalPace(makeGoal({ target: 0, saved: 0 }), [], TODAY).progress).toBe(0);
  });
});

describe('goalPace — a goal with a schedule', () => {
  const planned = (over: Partial<Parameters<typeof makeGoal>[0]> = {}) =>
    makeGoal({
      target: rupees(1_00_000),
      plan_amount: rupees(5_000),
      plan_cadence: 'monthly',
      plan_interval: 1,
      plan_start: on('2026-01-10'),
      ...over,
    });

  it('is on track when the paid-in total matches what the plan asked for', () => {
    // Three payments due by 15 March; ₹15,000 in.
    const pace = goalPace(planned({ saved: rupees(15_000) }), [], TODAY);
    expect(pace.state).toBe('on-track');
    expect(pace.drift).toBe(0);
    expect(pace.driftPayments).toBe(0);
    expect(pace.requiredPerMonth).toBe(rupees(5_000));
  });

  it('is ahead once a full extra payment is in', () => {
    const pace = goalPace(planned({ saved: rupees(20_000) }), [], TODAY);
    expect(pace.state).toBe('ahead');
    expect(pace.drift).toBe(rupees(5_000));
    expect(pace.driftPayments).toBe(1);
  });

  it('is behind once a payment is properly missed', () => {
    const pace = goalPace(planned({ saved: rupees(10_000) }), [], TODAY);
    expect(pace.state).toBe('behind');
    expect(pace.drift).toBe(rupees(-5_000));
    expect(pace.driftPayments).toBe(-1);
  });

  it('gives a quarter of a payment of slack before it says behind', () => {
    // Rounding, or a payment made a day late, must not flip a steady saver.
    const slack = goalPace(planned({ saved: rupees(15_000) - rupees(1_250) }), [], TODAY);
    expect(slack.state).toBe('on-track');
    const past = goalPace(planned({ saved: rupees(15_000) - rupees(1_251) }), [], TODAY);
    expect(past.state).toBe('behind');
  });

  it('has nothing to judge before the first payment comes due', () => {
    const pace = goalPace(planned({ plan_start: on('2026-06-01') }), [], TODAY);
    expect(pace.state).toBe('upcoming');
    expect(pace.dueThisMonth).toBe(0);
    expect(isoDay(pace.nextDue as number)).toBe('2026-06-01');
  });

  it('asks for exactly this month payment when the plan is level', () => {
    // Three payments due by now, four by month end.
    const pace = goalPace(planned({ saved: rupees(15_000) }), [], TODAY);
    expect(pace.dueThisMonth).toBe(0);
    expect(pace.dueNextMonth).toBe(rupees(5_000));
  });

  it('folds a missed payment into what this month asks for', () => {
    // The catch-up is what makes a missed payment show up as a real shortfall
    // rather than being quietly forgotten.
    const pace = goalPace(planned({ saved: rupees(5_000) }), [], TODAY);
    expect(pace.driftPayments).toBe(-2);
    // Three payments due by 31 March (10 Jan, 10 Feb, 10 Mar), ₹5,000 in, so
    // ₹10,000 is owed before the month is out — the two missed payments, not
    // just the one this month would otherwise have asked for.
    expect(pace.dueThisMonth).toBe(rupees(10_000));
    expect(pace.dueNextMonth).toBe(rupees(5_000));
  });

  it('asks for nothing more this month once the plan is run ahead of', () => {
    const pace = goalPace(planned({ saved: rupees(40_000) }), [], TODAY);
    expect(pace.dueThisMonth).toBe(0);
    expect(pace.dueNextMonth).toBe(0);
  });

  it('never asks for more than is actually left to go', () => {
    const pace = goalPace(planned({ target: rupees(12_000), saved: 0 }), [], TODAY);
    expect(pace.dueThisMonth).toBe(rupees(12_000));
    expect(pace.dueNextMonth).toBe(0);
    expect(pace.dueThisMonth + pace.dueNextMonth).toBeLessThanOrEqual(pace.remaining);
  });

  it('points nextDue at the payment that has not landed yet', () => {
    const pace = goalPace(planned({ saved: rupees(15_000) }), [], TODAY);
    expect(isoDay(pace.nextDue as number)).toBe('2026-04-10');
  });

  it('reads as overdue once the target date has gone by, plan or no plan', () => {
    const pace = goalPace(
      planned({ saved: rupees(15_000), target_date: on('2026-02-01') }),
      [],
      TODAY
    );
    expect(pace.state).toBe('overdue');
    expect(pace.targetDatePassed).toBe(true);
  });

  it('converts a fortnightly plan to a monthly-equivalent ask', () => {
    const pace = goalPace(
      planned({ plan_cadence: 'weekly', plan_interval: 2, saved: 0 }),
      [],
      TODAY
    );
    expect(pace.requiredPerMonth).toBe(Math.round((rupees(5_000) * 52) / 12 / 2));
  });
});

describe('goalPace — a goal with a date but no schedule', () => {
  const dated = (over: Partial<Parameters<typeof makeGoal>[0]> = {}) =>
    makeGoal({ target: rupees(60_000), target_date: on('2026-09-15'), ...over });

  it('paces along a straight line to the deadline', () => {
    const pace = goalPace(dated({ saved: rupees(10_000) }), [], TODAY);
    // Six months to go, ₹50,000 left.
    expect(pace.requiredPerMonth).toBeGreaterThan(rupees(8_200));
    expect(pace.requiredPerMonth).toBeLessThan(rupees(8_500));
    expect(pace.driftPayments).toBe(0); // no payments to be behind by
    expect(pace.nextDue).toBeNull();
  });

  it('has nothing to judge before the first contribution', () => {
    expect(goalPace(dated(), [], TODAY).state).toBe('upcoming');
  });

  it('is on track while the observed rate keeps up with the ask', () => {
    const contributions = [
      makeContribution({ amount: rupees(25_000), date: on('2026-02-01') }),
      makeContribution({ amount: rupees(25_000), date: on('2026-03-01') }),
    ];
    const pace = goalPace(dated({ saved: rupees(50_000) }), contributions, TODAY);
    expect(pace.ratePerMonth).toBe(Math.round(rupees(50_000) / 3));
    expect(pace.state).toBe('ahead');
  });

  it('is behind when the run rate falls short of the ask', () => {
    const pace = goalPace(
      dated({ saved: rupees(3_000) }),
      [makeContribution({ amount: rupees(3_000), date: on('2026-03-01') })],
      TODAY
    );
    expect(pace.state).toBe('behind');
  });

  it('asks for the whole remainder when the deadline is inside this month', () => {
    const pace = goalPace(
      dated({ target_date: on('2026-03-28'), saved: rupees(50_000) }),
      [makeContribution({ amount: rupees(50_000), date: on('2026-03-01') })],
      TODAY
    );
    expect(pace.dueThisMonth).toBe(rupees(10_000));
    expect(pace.dueNextMonth).toBe(0);
  });

  it('credits what has already gone in this month against the ask', () => {
    const pace = goalPace(
      dated({ saved: rupees(10_000) }),
      [makeContribution({ amount: rupees(4_000), date: on('2026-03-02') })],
      TODAY
    );
    expect(pace.addedThisMonth).toBe(rupees(4_000));
    expect(pace.dueThisMonth).toBe((pace.requiredPerMonth as number) - rupees(4_000));
  });

  it('never asks for more per month than is left to go', () => {
    const pace = goalPace(
      dated({ target: rupees(1_000), saved: 0, target_date: on('2026-03-16') }),
      [makeContribution({ amount: 0, date: on('2026-03-01') })],
      TODAY
    );
    expect(pace.requiredPerMonth).toBe(rupees(1_000));
  });

  it('reads as overdue past the date, asking for the lot', () => {
    const pace = goalPace(
      dated({ target_date: on('2026-02-01'), saved: rupees(10_000) }),
      [makeContribution({ amount: rupees(10_000), date: on('2026-01-01') })],
      TODAY
    );
    expect(pace.state).toBe('overdue');
    expect(pace.dueThisMonth).toBe(rupees(50_000));
    expect(pace.drift).toBe(rupees(-50_000));
  });

  it('measures drift off a line from the first contribution to the deadline', () => {
    // Without a plan, the best "where should I be by now" available is a
    // straight line from the first contribution to the deadline. First
    // contribution 15 Jan, deadline 15 Sep: 243 days, of which 59 have gone by
    // on 15 March.
    const target = rupees(60_000);
    const onTheLine = Math.round((target * 59) / 243);
    const contributions = [makeContribution({ amount: onTheLine, date: on('2026-01-15') })];

    const level = goalPace(
      dated({ target, target_date: on('2026-09-15'), saved: onTheLine }),
      contributions,
      TODAY
    );
    // Rounding a hair below the line can hand back -0, which is still level.
    expect(level.drift).toBeCloseTo(0, 10);

    const ahead = goalPace(
      dated({ target, target_date: on('2026-09-15'), saved: onTheLine + rupees(5_000) }),
      contributions,
      TODAY
    );
    expect(ahead.drift).toBe(rupees(5_000));
  });

  it('has no line to measure against before the first contribution lands', () => {
    const pace = goalPace(dated({ saved: 0 }), [], TODAY);
    expect(pace.drift).toBe(0);
    expect(pace.state).toBe('upcoming');
  });
});

describe('goalPace — the observed run rate', () => {
  it('averages the trailing three months of top-ups', () => {
    const pace = goalPace(
      makeGoal({ target: rupees(1_00_000), saved: rupees(30_000) }),
      [
        makeContribution({ amount: rupees(10_000), date: on('2026-01-20') }),
        makeContribution({ amount: rupees(10_000), date: on('2026-02-20') }),
        makeContribution({ amount: rupees(10_000), date: on('2026-03-05') }),
      ],
      TODAY
    );
    expect(pace.ratePerMonth).toBe(rupees(10_000));
  });

  it('forgets anything older than the trailing window', () => {
    const pace = goalPace(
      makeGoal({ target: rupees(1_00_000), saved: rupees(90_000) }),
      [makeContribution({ amount: rupees(90_000), date: on('2024-01-01') })],
      TODAY
    );
    expect(pace.ratePerMonth).toBe(0);
    expect(pace.monthsToGo).toBeNull();
    expect(pace.etaDate).toBeNull();
  });

  it('leaves withdrawals out of the rate, so a refund does not read as saving', () => {
    const pace = goalPace(
      makeGoal({ target: rupees(1_00_000), saved: rupees(6_000) }),
      [
        makeContribution({ amount: rupees(9_000), date: on('2026-03-01') }),
        makeContribution({ amount: rupees(-3_000), date: on('2026-03-05') }),
      ],
      TODAY
    );
    expect(pace.ratePerMonth).toBe(rupees(3_000));
    // A withdrawal does count against what the month has actually added.
    expect(pace.addedThisMonth).toBe(rupees(6_000));
  });

  it('projects a completion date from the rate it observes', () => {
    const pace = goalPace(
      makeGoal({ target: rupees(1_00_000), saved: rupees(70_000) }),
      [makeContribution({ amount: rupees(30_000), date: on('2026-03-01') })],
      TODAY
    );
    expect(pace.ratePerMonth).toBe(rupees(10_000));
    expect(pace.monthsToGo).toBe(3);
    expect(isoDay(pace.etaDate as number)).toBe('2026-06-15');
  });
});

describe('groupContributions', () => {
  it('buckets by goal, preserving the order it was handed', () => {
    const a = makeContribution({ goal_id: 'g1', amount: 1 });
    const b = makeContribution({ goal_id: 'g2', amount: 2 });
    const c = makeContribution({ goal_id: 'g1', amount: 3 });
    const grouped = groupContributions([a, b, c]);
    expect(grouped.get('g1')).toEqual([a, c]);
    expect(grouped.get('g2')).toEqual([b]);
  });

  it('simply omits a goal with no history, which callers read as empty', () => {
    const grouped = groupContributions([]);
    expect(grouped.get('g1')).toBeUndefined();
    expect(grouped.get('g1') ?? []).toEqual([]);
  });
});

describe('fundingBreakdown', () => {
  const acc = makeAccount({ id: 'acc-1', name: 'HDFC Salary', color: '#1E7F75' });
  const inv = makeInvestment({ id: 'inv-1', name: 'Flexi Cap', color: '#8158C8' });
  const accounts = new Map<ID, Account>([[acc.id, acc]]);
  const investments = new Map<ID, Investment>([[inv.id, inv]]);

  it('has nothing to show for a goal with no contributions', () => {
    expect(fundingBreakdown([], accounts, investments)).toEqual([]);
  });

  it('names each source and orders the largest first', () => {
    const slices = fundingBreakdown(
      [
        makeContribution({ account_id: 'acc-1', amount: rupees(5_000) }),
        makeContribution({ investment_id: 'inv-1', amount: rupees(20_000) }),
      ],
      accounts,
      investments
    );
    expect(slices.map((s) => s.name)).toEqual(['Flexi Cap', 'HDFC Salary']);
    expect(slices[0]).toMatchObject({ kind: 'investment', id: 'inv-1', color: '#8158C8' });
    expect(slices[1]).toMatchObject({ kind: 'account', id: 'acc-1', color: '#1E7F75' });
  });

  it('rolls repeat top-ups from one source into a single row', () => {
    const slices = fundingBreakdown(
      [
        makeContribution({ account_id: 'acc-1', amount: rupees(5_000) }),
        makeContribution({ account_id: 'acc-1', amount: rupees(3_000) }),
      ],
      accounts,
      investments
    );
    expect(slices).toHaveLength(1);
    expect(slices[0].amount).toBe(rupees(8_000));
  });

  it('drops a source that was put in and later taken back out entirely', () => {
    const slices = fundingBreakdown(
      [
        makeContribution({ account_id: 'acc-1', amount: rupees(5_000) }),
        makeContribution({ account_id: 'acc-1', amount: rupees(-5_000) }),
      ],
      accounts,
      investments
    );
    expect(slices).toEqual([]);
  });

  it('labels a contribution with no source at all', () => {
    const slices = fundingBreakdown(
      [makeContribution({ amount: rupees(1_000) })],
      accounts,
      investments
    );
    expect(slices[0]).toMatchObject({ kind: 'unattributed', id: null, name: 'Not linked to a source' });
  });

  it('still shows money from a source that has since been deleted', () => {
    // The rupees really did come from somewhere; the row says so without a name.
    const slices = fundingBreakdown(
      [makeContribution({ account_id: 'gone', amount: rupees(1_000) })],
      accounts,
      investments
    );
    expect(slices[0]).toMatchObject({ kind: 'account', id: 'gone', name: 'Removed source' });
    expect(slices[0].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('keeps an account and a holding that share an id apart', () => {
    const slices = fundingBreakdown(
      [
        makeContribution({ account_id: 'same', amount: rupees(1_000) }),
        makeContribution({ investment_id: 'same', amount: rupees(2_000) }),
      ],
      accounts,
      investments
    );
    expect(slices).toHaveLength(2);
    expect(slices.map((s) => s.kind).sort()).toEqual(['account', 'investment']);
  });
});

describe('PACE_TONE', () => {
  it('has a label and classes for every state pace can return', () => {
    const states = [
      'reached',
      'ahead',
      'on-track',
      'behind',
      'overdue',
      'upcoming',
      'unplanned',
    ] as const;
    for (const state of states) {
      expect(PACE_TONE[state].label.length).toBeGreaterThan(0);
      expect(PACE_TONE[state].className).toContain('text-');
      expect(PACE_TONE[state].chipClassName).toContain('bg-');
    }
  });
});
