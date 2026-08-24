import { describe, expect, it } from 'vitest';
import {
  anchorFor,
  cadenceInterval,
  cadenceLabel,
  detectRecurring,
  firstDueFromToday,
  merchantKey,
  monthlyEquivalent,
  rollForward,
  stepCadence,
  stepCadenceBack,
} from './recurrence';
import { makeTransaction, rupees } from './test-factories';
import { isoDay } from './dates';

const at = (iso: string) => new Date(`${iso}T00:00:00`);
const on = (iso: string) => at(iso).getTime();

describe('cadenceInterval', () => {
  it('defaults a legacy row with no interval to every-one', () => {
    expect(cadenceInterval(undefined)).toBe(1);
    expect(cadenceInterval(null)).toBe(1);
  });

  it('never lets an interval fall below one, which would make stepping a no-op', () => {
    expect(cadenceInterval(0)).toBe(1);
    expect(cadenceInterval(-3)).toBe(1);
  });

  it('rounds a fractional interval to a whole number of periods', () => {
    expect(cadenceInterval(2.4)).toBe(2);
    expect(cadenceInterval(2.6)).toBe(3);
  });
});

describe('stepCadence', () => {
  it('steps a day, a week, a month and a year', () => {
    expect(isoDay(stepCadence(on('2026-03-10'), 'daily'))).toBe('2026-03-11');
    expect(isoDay(stepCadence(on('2026-03-10'), 'weekly'))).toBe('2026-03-17');
    expect(isoDay(stepCadence(on('2026-03-10'), 'monthly'))).toBe('2026-04-10');
    expect(isoDay(stepCadence(on('2026-03-10'), 'yearly'))).toBe('2027-03-10');
  });

  it('multiplies the step by the interval', () => {
    expect(isoDay(stepCadence(on('2026-03-10'), 'daily', 3))).toBe('2026-03-13');
    expect(isoDay(stepCadence(on('2026-03-10'), 'weekly', 2))).toBe('2026-03-24');
    expect(isoDay(stepCadence(on('2026-03-10'), 'monthly', 3))).toBe('2026-06-10');
  });

  it('clamps into a short month instead of overflowing past it', () => {
    // setMonth alone turns 31 January into 3 March, and a rent rule on the 31st
    // drifted further into the month every time it rolled.
    expect(isoDay(stepCadence(on('2026-01-31'), 'monthly'))).toBe('2026-02-28');
    expect(isoDay(stepCadence(on('2026-03-31'), 'monthly'))).toBe('2026-04-30');
  });

  it('recovers the anchor day after a month that clamped it short', () => {
    // Without the anchor, February would cost a 31st rule its date forever:
    // 31 Jan → 28 Feb → 28 Mar. With it, March gets its 31st back.
    const feb = stepCadence(on('2026-01-31'), 'monthly', 1, 31);
    expect(isoDay(feb)).toBe('2026-02-28');
    expect(isoDay(stepCadence(feb, 'monthly', 1, 31))).toBe('2026-03-31');
  });

  it('clamps 29 February to the 28th in a common year', () => {
    expect(isoDay(stepCadence(on('2028-02-29'), 'yearly'))).toBe('2029-02-28');
  });

  it('ignores an anchor day outside 1..31 and falls back to the date it has', () => {
    expect(isoDay(stepCadence(on('2026-03-10'), 'monthly', 1, 0))).toBe('2026-04-10');
    expect(isoDay(stepCadence(on('2026-03-10'), 'monthly', 1, 44))).toBe('2026-04-10');
  });
});

describe('stepCadenceBack', () => {
  it('is the inverse of a forward step on an ordinary date', () => {
    for (const cadence of ['daily', 'weekly', 'monthly', 'yearly'] as const) {
      const fwd = stepCadence(on('2026-03-10'), cadence, 2);
      expect(isoDay(stepCadenceBack(fwd, cadence, 2))).toBe('2026-03-10');
    }
  });

  it('clamps backwards into a short month too', () => {
    expect(isoDay(stepCadenceBack(on('2026-03-31'), 'monthly'))).toBe('2026-02-28');
  });

  it('crosses the year boundary going backwards', () => {
    expect(isoDay(stepCadenceBack(on('2026-01-15'), 'monthly'))).toBe('2025-12-15');
  });
});

describe('rollForward', () => {
  const today = at('2026-03-10');

  it('leaves a future due date where it is', () => {
    expect(isoDay(rollForward(on('2026-04-01'), 'monthly', 1, today))).toBe('2026-04-01');
  });

  it('keeps a due date that lands exactly on today', () => {
    // Today's bill is due today, not next month.
    expect(isoDay(rollForward(on('2026-03-10'), 'monthly', 1, today))).toBe('2026-03-10');
  });

  it('advances a long-overdue anchor to the next occurrence at or after today', () => {
    expect(isoDay(rollForward(on('2025-06-01'), 'monthly', 1, today))).toBe('2026-04-01');
  });

  it('honours a custom interval while catching up', () => {
    // Every 2 weeks from 1 Jan: 15, 29 Jan, 12, 26 Feb, 12 Mar.
    expect(isoDay(rollForward(on('2026-01-01'), 'weekly', 2, today))).toBe('2026-03-12');
  });

  it('holds a monthly rule to its anchor day across a short February', () => {
    expect(isoDay(rollForward(on('2026-01-31'), 'monthly', 1, today, 31))).toBe('2026-03-31');
  });

  it('gives up rather than spinning forever on an absurdly stale daily rule', () => {
    // The guard caps the walk; the point is that it returns at all.
    const rolled = rollForward(on('1900-01-01'), 'daily', 1, today);
    expect(Number.isFinite(rolled)).toBe(true);
  });
});

describe('firstDueFromToday', () => {
  it('sets the first hit one full cadence out, not today', () => {
    const ref = at('2026-03-10');
    expect(isoDay(firstDueFromToday('monthly', 1, ref))).toBe('2026-04-10');
    expect(isoDay(firstDueFromToday('weekly', 2, ref))).toBe('2026-03-24');
  });

  it('starts from local midnight, so the time of day never leaks into the date', () => {
    const evening = new Date(2026, 2, 10, 22, 45);
    expect(isoDay(firstDueFromToday('daily', 1, evening))).toBe('2026-03-11');
  });
});

describe('anchorFor', () => {
  it('pins a weekly rule to its day of the week', () => {
    // 10 March 2026 is a Tuesday.
    expect(anchorFor('weekly', on('2026-03-10'))).toBe(2);
  });

  it('pins every other cadence to its day of the month', () => {
    expect(anchorFor('monthly', on('2026-03-10'))).toBe(10);
    expect(anchorFor('daily', on('2026-03-10'))).toBe(10);
    expect(anchorFor('yearly', on('2026-03-10'))).toBe(10);
  });
});

describe('monthlyEquivalent', () => {
  it('converts each cadence to a monthly-equivalent cost', () => {
    expect(monthlyEquivalent(rupees(100), 'daily')).toBe(Math.round((rupees(100) * 365) / 12));
    expect(monthlyEquivalent(rupees(500), 'weekly')).toBe(Math.round((rupees(500) * 52) / 12));
    expect(monthlyEquivalent(rupees(600), 'monthly')).toBe(rupees(600));
    expect(monthlyEquivalent(rupees(12_000), 'yearly')).toBe(rupees(1_000));
  });

  it('divides by the interval, so every-other-month costs half', () => {
    expect(monthlyEquivalent(rupees(600), 'monthly', 2)).toBe(rupees(300));
    expect(monthlyEquivalent(rupees(600), 'weekly', 2)).toBe(
      Math.round((rupees(600) * 52) / 12 / 2)
    );
  });

  it('returns whole paise, never a fraction', () => {
    expect(Number.isInteger(monthlyEquivalent(999_99, 'yearly', 7))).toBe(true);
  });
});

describe('cadenceLabel', () => {
  it('uses the plain adverb at interval one', () => {
    expect(cadenceLabel('daily')).toBe('Daily');
    expect(cadenceLabel('weekly')).toBe('Weekly');
    expect(cadenceLabel('monthly')).toBe('Monthly');
    expect(cadenceLabel('yearly')).toBe('Yearly');
  });

  it('spells out a custom interval', () => {
    expect(cadenceLabel('weekly', 2)).toBe('Every 2 weeks');
    expect(cadenceLabel('monthly', 3)).toBe('Every 3 months');
  });

  it('normalises a junk interval back to the plain adverb', () => {
    expect(cadenceLabel('monthly', 0)).toBe('Monthly');
  });
});

describe('merchantKey', () => {
  it('folds case and surrounding whitespace so the same payee matches itself', () => {
    expect(merchantKey('  Netflix ')).toBe('netflix');
    expect(merchantKey('NETFLIX')).toBe(merchantKey('netflix'));
  });

  it('is empty for a blank merchant, which callers use to skip the entry', () => {
    expect(merchantKey('   ')).toBe('');
    expect(merchantKey('')).toBe('');
  });
});

describe('detectRecurring', () => {
  const monthly = (merchant: string, amounts: [string, number][]) =>
    amounts.map(([iso, amount]) =>
      makeTransaction({ merchant, amount, date: on(iso), account_id: 'acc-1' })
    );

  it('finds a steady monthly subscription', () => {
    const found = detectRecurring(
      monthly('Netflix', [
        ['2026-01-05', rupees(649)],
        ['2026-02-05', rupees(649)],
        ['2026-03-05', rupees(649)],
      ])
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      merchant: 'Netflix',
      amount: rupees(649),
      cadence: 'monthly',
      occurrences: 3,
    });
  });

  it('needs at least two occurrences before it will guess', () => {
    expect(detectRecurring(monthly('Netflix', [['2026-01-05', rupees(649)]]))).toEqual([]);
  });

  it('recognises weekly and yearly spacing too', () => {
    const weekly = detectRecurring(
      monthly('Dhobi', [
        ['2026-03-02', rupees(300)],
        ['2026-03-09', rupees(300)],
        ['2026-03-16', rupees(300)],
      ])
    );
    expect(weekly[0].cadence).toBe('weekly');

    const yearly = detectRecurring(
      monthly('Domain renewal', [
        ['2024-04-01', rupees(1_200)],
        ['2025-04-01', rupees(1_200)],
      ])
    );
    expect(yearly[0].cadence).toBe('yearly');
  });

  it('ignores spacing that matches no cadence', () => {
    // Roughly quarterly: real, but not something the rule engine can express.
    expect(
      detectRecurring(
        monthly('Odd', [
          ['2026-01-01', rupees(500)],
          ['2026-04-01', rupees(500)],
          ['2026-07-01', rupees(500)],
        ])
      )
    ).toEqual([]);
  });

  it('tolerates a small price change but not a large one', () => {
    const nudged = detectRecurring(
      monthly('Gym', [
        ['2026-01-05', rupees(1_000)],
        ['2026-02-05', rupees(1_050)], // +5%, within the ±8% band
        ['2026-03-05', rupees(1_000)],
      ])
    );
    expect(nudged).toHaveLength(1);
    expect(nudged[0].occurrences).toBe(3);

    const wild = detectRecurring(
      monthly('Groceries', [
        ['2026-01-05', rupees(1_000)],
        ['2026-02-05', rupees(4_000)],
      ])
    );
    expect(wild).toEqual([]);
  });

  it('takes the median amount, not the middle entry by date', () => {
    // The group arrives in date order, so the middle *element* here is the odd
    // ₹50,000 March charge. Measuring every other charge against that yardstick
    // would leave one lone survivor of the ±8% filter and lose a real bill.
    const found = detectRecurring(
      monthly('Rent', [
        ['2026-01-01', rupees(25_000)],
        ['2026-02-01', rupees(25_000)],
        ['2026-03-01', rupees(50_000)], // a deposit paid alongside the rent
        ['2026-04-01', rupees(25_000)],
        ['2026-05-01', rupees(25_000)],
      ])
    );
    expect(found).toHaveLength(1);
    expect(found[0].amount).toBe(rupees(25_000));
    expect(found[0].occurrences).toBe(4);
  });

  it('survives a single skipped month by taking the median gap', () => {
    // February is dropped by the amount filter, leaving a two-month hole. The
    // mean gap would fall outside the monthly window; the median shrugs it off.
    const found = detectRecurring(
      monthly('Rent', [
        ['2026-01-01', rupees(25_000)],
        ['2026-02-01', rupees(90_000)], // a one-off, filtered out
        ['2026-03-01', rupees(25_000)],
        ['2026-04-01', rupees(25_000)],
        ['2026-05-01', rupees(25_000)],
      ])
    );
    expect(found).toHaveLength(1);
    expect(found[0].cadence).toBe('monthly');
  });

  it('reports the most recent entry as the exemplar', () => {
    const found = detectRecurring([
      makeTransaction({
        merchant: 'netflix',
        amount: rupees(649),
        date: on('2026-01-05'),
        account_id: 'acc-old',
        category_id: 'cat-old',
      }),
      makeTransaction({
        merchant: 'Netflix',
        amount: rupees(649),
        date: on('2026-02-05'),
        account_id: 'acc-new',
        category_id: 'cat-new',
      }),
    ]);
    expect(found[0]).toMatchObject({
      merchant: 'Netflix',
      account_id: 'acc-new',
      category_id: 'cat-new',
    });
  });

  it('groups case-insensitively but skips entries with no merchant at all', () => {
    const found = detectRecurring([
      ...monthly('', [
        ['2026-01-05', rupees(200)],
        ['2026-02-05', rupees(200)],
      ]),
      makeTransaction({ merchant: 'Jio', amount: rupees(399), date: on('2026-01-08') }),
      makeTransaction({ merchant: 'JIO ', amount: rupees(399), date: on('2026-02-08') }),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].merchant).toBe('JIO ');
  });

  it('looks only at live expenses — income and tombstones are not bills', () => {
    const found = detectRecurring([
      ...monthly('Salary', [
        ['2026-01-01', rupees(80_000)],
        ['2026-02-01', rupees(80_000)],
      ]).map((t) => ({ ...t, type: 'income' as const })),
      ...monthly('Deleted sub', [
        ['2026-01-01', rupees(500)],
        ['2026-02-01', rupees(500)],
      ]).map((t) => ({ ...t, deleted_at: on('2026-02-10') })),
    ]);
    expect(found).toEqual([]);
  });

  it('does not divide by a zero or negative median', () => {
    expect(
      detectRecurring(
        monthly('Refunded', [
          ['2026-01-05', 0],
          ['2026-02-05', 0],
        ])
      )
    ).toEqual([]);
  });

  it('detects several independent bills in one pass', () => {
    const found = detectRecurring([
      ...monthly('Netflix', [
        ['2026-01-05', rupees(649)],
        ['2026-02-05', rupees(649)],
      ]),
      ...monthly('Rent', [
        ['2026-01-01', rupees(25_000)],
        ['2026-02-01', rupees(25_000)],
      ]),
    ]);
    expect(found.map((r) => r.merchant).sort()).toEqual(['Netflix', 'Rent']);
  });
});
