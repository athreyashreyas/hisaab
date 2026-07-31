/**
 * Money formatting. Every amount in Hisaab is integer paise (₹1 = 100) right up
 * until it is rendered, so this module is the only place rupees exist.
 *
 * Nothing here touches the database or React; it is pure string work, which is
 * why it sits on its own rather than inside the screen that happens to need it.
 */

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * ₹1,23,456 — Indian digit grouping (lakh/crore).
 *
 * Paise are shown automatically whenever the amount actually has any: ₹1,240.50
 * reads in full, while ₹1,240 stays clean. Rounding a real ₹1,240.50 balance
 * down to "₹1,241" was quietly lying about the number, and there is no amount in
 * the app that is safe to round — an opening balance, a split, or a ₹99.50 spend
 * all have to add up. Pass `true`/`false` to force the decision either way.
 */
export function formatINR(paise: number, showPaise: boolean | 'auto' = 'auto'): string {
  const rupees = paise / 100;
  const withPaise = showPaise === 'auto' ? hasPaise(paise) : showPaise;
  return withPaise ? inrPaise.format(rupees) : inr.format(rupees);
}

/** True when an amount carries paise, i.e. it isn't a whole number of rupees. */
export function hasPaise(paise: number): boolean {
  return Math.round(paise) % 100 !== 0;
}

/** Compact form for chart labels: ₹1.2L, ₹34.5k, ₹980. */
export function formatCompactINR(paise: number): string {
  const r = Math.abs(paise) / 100;
  const sign = paise < 0 ? '-' : '';
  if (r >= 1e7) return `${sign}₹${(r / 1e7).toFixed(2)}Cr`;
  if (r >= 1e5) return `${sign}₹${(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `${sign}₹${(r / 1e3).toFixed(1)}k`;
  return `${sign}₹${Math.round(r)}`;
}

/**
 * Compact money for tight spots: ₹1.2L, ₹34k. Amounts under ₹1,000 fall through
 * to the full format so their paise survive — "₹99" for a ₹99.50 top-up would be
 * the one place in the app where a figure quietly loses money.
 */
export function formatShort(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const r = abs / 100;
  if (r >= 1e7) return `${sign}₹${(r / 1e7).toFixed(2)}Cr`;
  if (r >= 1e5) return `${sign}₹${(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `${sign}₹${(r / 1e3).toFixed(0)}k`;
  return `${sign}${formatINR(abs)}`;
}

/**
 * Normalise raw text from a decimal input down to what we can parse: an optional
 * leading minus, digits, and at most one decimal point capped at two places
 * (paise is the smallest unit we store). Extra dots and stray characters are
 * dropped rather than rejected, so typing stays forgiving.
 *
 * Money itself is entered through AmountField's keypad, which works in whole
 * paise and needs none of this; the one remaining caller is an FD's interest
 * rate, where a plain [^0-9.] strip would still let "7.1.2" through and
 * Number() would turn that into NaN.
 */
export function sanitiseDecimalInput(value: string, allowNegative = false): string {
  const negative = allowNegative && value.trimStart().startsWith('-');
  const [whole = '', ...rest] = value.replace(/[^0-9.]/g, '').split('.');
  const decimals = rest.join('').slice(0, 2);
  const body = rest.length > 0 ? `${whole}.${decimals}` : whole;
  return negative ? `-${body}` : body;
}
