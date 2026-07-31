/**
 * Portfolio arithmetic. Hisaab is local-first with no outbound market feed, so a
 * holding's `current_value` is whatever the user last entered and returns are
 * measured against `invested`.
 */
import type { Investment } from '../types';

export interface PortfolioSummary {
  invested: number; // paise
  current: number; // paise
  gain: number; // paise (current − invested)
  returnPct: number; // gain / invested, 0 when nothing invested
}

/** Roll a set of holdings into invested / current / gain totals. */
export function portfolioSummary(holdings: Investment[]): PortfolioSummary {
  const invested = holdings.reduce((s, h) => s + h.invested, 0);
  const current = holdings.reduce((s, h) => s + h.current_value, 0);
  const gain = current - invested;
  return { invested, current, gain, returnPct: invested > 0 ? gain / invested : 0 };
}
