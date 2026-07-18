/**
 * The banknote palette. Hisaab's quiet delight: an amount carries the colour of
 * the note you'd reach for to pay it. A ₹47 coffee reads in ₹50 blue; a ₹1,800
 * dinner in ₹2,000 magenta. It's a colour system that could only belong to an
 * Indian money app.
 *
 * The colours are the modern Mahatma Gandhi (New) series, tuned a little to sit
 * on parchment without shouting. Two things read these:
 *   - the amount pad, so the big figure takes on its note colour as you type;
 *   - each ledger entry, as a slim edge stripe in its note's colour.
 *
 * Teal stays the brand: nav, the safe-to-spend card, the logo. The notes belong
 * to the money itself, not the chrome, which is exactly the line the colour is
 * meant to draw.
 *
 * A band is chosen by the smallest real note that would cover the spend, so the
 * colour answers "which note is this?" the way you'd actually think about it.
 */

export interface Denomination {
  /** Rupee face value of the note. */
  value: number;
  /** Tuned MG-series colour. */
  color: string;
  /** A faint wash of the same colour, for a resting tint behind an entry. */
  tint: string;
  /** Short label, e.g. for the guide. */
  label: string;
}

// Ordered small → large. `value` is rupees; amounts elsewhere are paise.
export const DENOMINATIONS: Denomination[] = [
  { value: 10, color: '#8A5A3B', tint: 'rgba(138,90,59,0.12)', label: '₹10' }, // chocolate
  { value: 20, color: '#77871A', tint: 'rgba(119,135,26,0.14)', label: '₹20' }, // greenish-yellow
  { value: 50, color: '#1F7BA8', tint: 'rgba(31,123,168,0.13)', label: '₹50' }, // fluorescent blue
  { value: 100, color: '#8158C8', tint: 'rgba(129,88,200,0.13)', label: '₹100' }, // lavender
  { value: 200, color: '#C06E1C', tint: 'rgba(192,110,28,0.14)', label: '₹200' }, // bright yellow
  { value: 500, color: '#6B6E68', tint: 'rgba(107,110,104,0.14)', label: '₹500' }, // stone grey
  { value: 2000, color: '#C43E82', tint: 'rgba(196,62,130,0.13)', label: '₹2,000' }, // magenta
];

const FALLBACK = DENOMINATIONS[0]; // ₹0 / empty amount rests on the smallest note

/**
 * The note whose colour an amount (in paise) carries: the smallest denomination
 * that would cover it, and the largest note once the amount runs past it. Zero
 * or a stray negative rests on the smallest, so an empty amount pad has a calm
 * starting colour rather than none.
 */
export function denominationFor(paise: number): Denomination {
  const rupees = Math.abs(paise) / 100;
  if (!(rupees > 0)) return FALLBACK;
  for (const d of DENOMINATIONS) {
    if (rupees <= d.value) return d;
  }
  return DENOMINATIONS[DENOMINATIONS.length - 1];
}

/** Just the colour, the common case at call sites. */
export function denominationColor(paise: number): string {
  return denominationFor(paise).color;
}
