/**
 * Category palette + seed data.
 *
 * The palette is drawn from India's banknotes — the modern Mahatma Gandhi (New)
 * series — so category colours share the same money DNA as the amount tints (see
 * lib/denominations). Tuned a touch to sit on parchment without shouting, and
 * none of them fighting Hisaab's teal brand.
 *
 * The first six are a validated, colour-blind-safe categorical set (checked with
 * the data-viz palette validator: lightness band, chroma floor, CVD separation,
 * and contrast on parchment all pass). Those six carry the common categories, so
 * the pie stays legible for everyone; the remaining swatches are for user choice.
 * `grey` is the reserved neutral for "Other" / uncategorised, never counted as a
 * categorical hue.
 */

export const CATEGORY_PALETTE: Record<string, string> = {
  amber: '#C06E1C', // ₹200 bright yellow
  blue: '#1F7BA8', // ₹50 fluorescent blue
  magenta: '#C43E82', // ₹2,000 magenta
  lime: '#77871A', // ₹20 greenish-yellow
  lavender: '#8158C8', // ₹100 lavender
  green: '#3E7D3A', // note green
  chocolate: '#8A5A3B', // ₹10 chocolate
  teal: '#1E7F75', // brand
  grey: '#6B6E68', // ₹500 stone grey — neutral / Other
};

/** Accent colours for accounts (kept separate so accounts read as chips, not categories). */
export const ACCENT_PALETTE: string[] = [
  '#1E7F75', // teal (brand)
  '#1F7BA8', // ₹50 blue
  '#8158C8', // ₹100 lavender
  '#C06E1C', // ₹200 amber
  '#3E7D3A', // green
  '#6B6E68', // ₹500 grey
];

export interface SeedCategory {
  name: string;
  icon: string; // lucide-react icon name
  color: string;
}

/**
 * Sensible India-first defaults. Users edit freely; these just make the empty
 * app usable on day one. Icons are lucide-react names.
 */
// The six most common categories take the validated CVD-safe hues (amber, blue,
// magenta, lime, lavender, green), so the everyday pie is legible for everyone.
// The long tail takes the extension swatches; "Other" takes the grey neutral.
export const DEFAULT_CATEGORIES: SeedCategory[] = [
  { name: 'Food & dining', icon: 'utensils', color: CATEGORY_PALETTE.amber },
  { name: 'Groceries', icon: 'shopping-basket', color: CATEGORY_PALETTE.lime },
  { name: 'Transport', icon: 'bus', color: CATEGORY_PALETTE.blue },
  { name: 'Rent & bills', icon: 'receipt', color: CATEGORY_PALETTE.grey },
  { name: 'Shopping', icon: 'shopping-bag', color: CATEGORY_PALETTE.magenta },
  { name: 'Health', icon: 'heart-pulse', color: CATEGORY_PALETTE.green },
  { name: 'Entertainment', icon: 'clapperboard', color: CATEGORY_PALETTE.lavender },
  { name: 'Travel', icon: 'plane', color: CATEGORY_PALETTE.teal },
  { name: 'Subscriptions', icon: 'repeat', color: CATEGORY_PALETTE.chocolate },
  { name: 'Gifts', icon: 'gift', color: CATEGORY_PALETTE.magenta },
  { name: 'Other', icon: 'circle-dashed', color: CATEGORY_PALETTE.grey },
];

/**
 * Rules-first auto-categorisation. Match a merchant string (lower-cased) to a
 * default category name. Deterministic, no model needed — the right call for an
 * 8GB machine. Extend from the user's own history later (most-frequent category
 * per merchant beats any static list once there's data).
 */
export const MERCHANT_RULES: { pattern: RegExp; category: string }[] = [
  { pattern: /swiggy|zomato|blue tokai|starbucks|cafe|restaurant|dominos|kfc/i, category: 'Food & dining' },
  { pattern: /bigbasket|blinkit|zepto|dmart|grofers|reliance fresh/i, category: 'Groceries' },
  { pattern: /uber|ola|rapido|irctc|metro|petrol|hpcl|iocl|bpcl|fuel/i, category: 'Transport' },
  { pattern: /electricity|water|gas|broadband|airtel|jio|vi |bescom|rent/i, category: 'Rent & bills' },
  { pattern: /amazon|flipkart|myntra|ajio|nykaa|meesho/i, category: 'Shopping' },
  { pattern: /pharmacy|apollo|1mg|pharmeasy|hospital|clinic|practo/i, category: 'Health' },
  { pattern: /netflix|spotify|prime video|hotstar|youtube premium|bookmyshow/i, category: 'Subscriptions' },
  { pattern: /makemytrip|goibibo|indigo|vistara|oyo|airbnb|cleartrip/i, category: 'Travel' },
];

/** Best-effort category name for a merchant string, or null if no rule matches. */
export function guessCategory(merchant: string): string | null {
  const m = merchant.trim();
  for (const rule of MERCHANT_RULES) if (rule.pattern.test(m)) return rule.category;
  return null;
}
