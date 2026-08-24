import { describe, expect, it } from 'vitest';
import { portfolioSummary } from './portfolio';
import { makeInvestment, rupees } from './test-factories';

describe('portfolioSummary', () => {
  it('is all zeroes for an empty portfolio, with no division by nothing', () => {
    expect(portfolioSummary([])).toEqual({ invested: 0, current: 0, gain: 0, returnPct: 0 });
  });

  it('rolls several holdings into invested, current and gain', () => {
    const summary = portfolioSummary([
      makeInvestment({ invested: rupees(1_00_000), current_value: rupees(1_20_000) }),
      makeInvestment({ invested: rupees(50_000), current_value: rupees(55_000) }),
    ]);
    expect(summary.invested).toBe(rupees(1_50_000));
    expect(summary.current).toBe(rupees(1_75_000));
    expect(summary.gain).toBe(rupees(25_000));
  });

  it('measures the return against what went in', () => {
    const summary = portfolioSummary([
      makeInvestment({ invested: rupees(1_00_000), current_value: rupees(1_20_000) }),
    ]);
    expect(summary.returnPct).toBeCloseTo(0.2, 10);
  });

  it('reports a loss as a negative gain and a negative return', () => {
    const summary = portfolioSummary([
      makeInvestment({ invested: rupees(1_00_000), current_value: rupees(80_000) }),
    ]);
    expect(summary.gain).toBe(rupees(-20_000));
    expect(summary.returnPct).toBeCloseTo(-0.2, 10);
  });

  it('nets a winner against a loser rather than reporting them apart', () => {
    const summary = portfolioSummary([
      makeInvestment({ invested: rupees(1_00_000), current_value: rupees(1_40_000) }),
      makeInvestment({ invested: rupees(1_00_000), current_value: rupees(60_000) }),
    ]);
    expect(summary.gain).toBe(0);
    expect(summary.returnPct).toBe(0);
  });

  it('reads a return of zero when nothing was ever invested', () => {
    // A holding gifted in at zero cost basis has no meaningful percentage; the
    // alternative is Infinity on screen.
    const summary = portfolioSummary([
      makeInvestment({ invested: 0, current_value: rupees(10_000) }),
    ]);
    expect(summary.gain).toBe(rupees(10_000));
    expect(summary.returnPct).toBe(0);
  });

  it('sums exactly, since every amount is whole paise', () => {
    const summary = portfolioSummary([
      makeInvestment({ invested: 1, current_value: 2 }),
      makeInvestment({ invested: 2, current_value: 3 }),
      makeInvestment({ invested: 3, current_value: 4 }),
    ]);
    expect(summary.invested).toBe(6);
    expect(summary.current).toBe(9);
    expect(summary.gain).toBe(3);
  });

  it('counts exactly the holdings it is handed, archived or not', () => {
    // Filtering archived holdings out is the caller's job, so that net worth
    // and the portfolio screen can ask different questions of the same function.
    const archived = makeInvestment({
      invested: rupees(10_000),
      current_value: rupees(11_000),
      archived: true,
    });
    expect(portfolioSummary([archived]).current).toBe(rupees(11_000));
  });
});
