import { describe, expect, it } from 'vitest';
import {
  formatCompactINR,
  formatINR,
  formatShort,
  hasPaise,
  sanitiseDecimalInput,
} from './money';

// Intl inserts U+00A0 between the symbol and the digits under en-IN. Tests
// compare on the normalised string so an assertion reads the way the number
// looks on screen rather than carrying an invisible character.
const plain = (s: string) => s.replace(/ /g, '');

describe('formatINR', () => {
  it('groups by lakh and crore, not by thousand', () => {
    expect(plain(formatINR(100_00))).toBe('₹100');
    expect(plain(formatINR(1_00_000_00))).toBe('₹1,00,000');
    expect(plain(formatINR(1_23_45_678_00))).toBe('₹1,23,45,678');
  });

  it('shows paise only when the amount actually has any', () => {
    expect(plain(formatINR(1240_00))).toBe('₹1,240');
    expect(plain(formatINR(1240_50))).toBe('₹1,240.50');
  });

  it('honours an explicit decision either way', () => {
    expect(plain(formatINR(1240_00, true))).toBe('₹1,240.00');
    // Forcing paise off on an amount that has them is the caller's call, and
    // the only place rounding is allowed to happen.
    expect(plain(formatINR(1240_50, false))).toBe('₹1,241');
  });

  it('keeps the sign on a negative amount', () => {
    expect(plain(formatINR(-500_00))).toBe('-₹500');
    expect(plain(formatINR(-99_50))).toBe('-₹99.50');
  });

  it('renders zero as a clean rupee figure', () => {
    expect(plain(formatINR(0))).toBe('₹0');
  });
});

describe('hasPaise', () => {
  it('is false for whole rupees, either sign', () => {
    expect(hasPaise(0)).toBe(false);
    expect(hasPaise(100)).toBe(false);
    expect(hasPaise(-100)).toBe(false);
  });

  it('is true the moment an amount carries paise', () => {
    expect(hasPaise(1)).toBe(true);
    expect(hasPaise(99_50)).toBe(true);
    expect(hasPaise(-99_50)).toBe(true);
  });

  it('rounds a fractional paise away before deciding', () => {
    // Sub-paise can only arrive from arithmetic, never from storage; treating
    // 100.4 as a whole ₹1 keeps a share-of-total from sprouting decimals.
    expect(hasPaise(100.4)).toBe(false);
    expect(hasPaise(100.6)).toBe(true);
  });
});

describe('formatCompactINR', () => {
  it('steps through k, L and Cr at the Indian thresholds', () => {
    expect(formatCompactINR(980_00)).toBe('₹980');
    expect(formatCompactINR(34_500_00)).toBe('₹34.5k');
    expect(formatCompactINR(1_20_000_00)).toBe('₹1.2L');
    expect(formatCompactINR(1_00_00_000_00)).toBe('₹1.00Cr');
  });

  it('switches unit exactly at the boundary, not just past it', () => {
    expect(formatCompactINR(999_00)).toBe('₹999');
    expect(formatCompactINR(1_000_00)).toBe('₹1.0k');
    expect(formatCompactINR(99_999_00)).toBe('₹100.0k');
    expect(formatCompactINR(1_00_000_00)).toBe('₹1.0L');
  });

  it('carries the sign outside the symbol', () => {
    expect(formatCompactINR(-1_20_000_00)).toBe('-₹1.2L');
    expect(formatCompactINR(-980_00)).toBe('-₹980');
  });

  it('reads zero as ₹0 rather than as a negative', () => {
    expect(formatCompactINR(0)).toBe('₹0');
  });
});

describe('formatShort', () => {
  it('drops the decimal on thousands, unlike the compact form', () => {
    // toFixed(0) rounds rather than truncates, so ₹34,500 reads as ₹35k here
    // and ₹34.5k in the compact form. The tight spots this feeds want a round
    // number more than they want the extra digit.
    expect(formatShort(34_500_00)).toBe('₹35k');
    expect(formatShort(34_400_00)).toBe('₹34k');
    expect(formatCompactINR(34_500_00)).toBe('₹34.5k');
  });

  it('falls through to the full format under ₹1,000 so paise survive', () => {
    // The whole point of the fallback: ₹99 for a ₹99.50 top-up would be the
    // one place in the app where a figure quietly loses money.
    expect(plain(formatShort(99_50))).toBe('₹99.50');
    expect(plain(formatShort(-99_50))).toBe('-₹99.50');
  });

  it('does not double the minus sign on a small negative', () => {
    expect(plain(formatShort(-500_00))).toBe('-₹500');
  });

  it('still uses L and Cr for the large end', () => {
    expect(formatShort(1_20_000_00)).toBe('₹1.2L');
    expect(formatShort(2_50_00_000_00)).toBe('₹2.50Cr');
  });
});

describe('sanitiseDecimalInput', () => {
  it('passes through what it can already parse', () => {
    expect(sanitiseDecimalInput('7.1')).toBe('7.1');
    expect(sanitiseDecimalInput('12')).toBe('12');
  });

  it('drops stray characters rather than rejecting the input', () => {
    expect(sanitiseDecimalInput('₹7.1%')).toBe('7.1');
    expect(sanitiseDecimalInput('7 . 1')).toBe('7.1');
  });

  it('collapses extra decimal points instead of yielding NaN', () => {
    // Number('7.1.2') is NaN; an FD rate field has to survive the second dot.
    expect(sanitiseDecimalInput('7.1.2')).toBe('7.12');
    expect(Number(sanitiseDecimalInput('7.1.2'))).toBe(7.12);
  });

  it('caps the fraction at two places, since paise is the smallest unit', () => {
    expect(sanitiseDecimalInput('7.98765')).toBe('7.98');
  });

  it('keeps a trailing dot so a half-typed number stays typeable', () => {
    expect(sanitiseDecimalInput('7.')).toBe('7.');
  });

  it('ignores a leading minus unless negatives are allowed', () => {
    expect(sanitiseDecimalInput('-7.1')).toBe('7.1');
    expect(sanitiseDecimalInput('-7.1', true)).toBe('-7.1');
  });

  it('only honours a minus that leads, not one buried mid-string', () => {
    expect(sanitiseDecimalInput('7-1', true)).toBe('71');
    expect(sanitiseDecimalInput('  -7.1', true)).toBe('-7.1');
  });

  it('returns an empty string for input with no digits at all', () => {
    expect(sanitiseDecimalInput('abc')).toBe('');
    expect(sanitiseDecimalInput('')).toBe('');
  });
});
