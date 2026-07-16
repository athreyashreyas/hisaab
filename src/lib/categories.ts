/**
 * Category palette + seed data.
 *
 * The palette is tuned to sit on parchment the way Attend's class colours do:
 * muted, slightly earthy, none of them fighting Hisaab's teal brand. Each is
 * distinct enough to tell apart in a 10-slice pie at small size.
 */

export const CATEGORY_PALETTE: Record<string, string> = {
  clay: '#B15E43',
  saffron: '#C98F3E',
  olive: '#8A8A4B',
  fern: '#5F8A5A',
  teal: '#1E7F75',
  cerulean: '#3E7CA1',
  indigo: '#5B6BA1',
  plum: '#8A5A82',
  rose: '#B85C72',
  slate: '#6B6960',
};

/** Accent colours for accounts (kept separate so accounts read as chips, not categories). */
export const ACCENT_PALETTE: string[] = [
  '#1E7F75', // teal
  '#3E7CA1', // cerulean
  '#8A5A82', // plum
  '#C98F3E', // saffron
  '#5F8A5A', // fern
  '#6B6960', // slate
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
export const DEFAULT_CATEGORIES: SeedCategory[] = [
  { name: 'Food & dining', icon: 'utensils', color: CATEGORY_PALETTE.clay },
  { name: 'Groceries', icon: 'shopping-basket', color: CATEGORY_PALETTE.fern },
  { name: 'Transport', icon: 'bus', color: CATEGORY_PALETTE.cerulean },
  { name: 'Rent & bills', icon: 'receipt', color: CATEGORY_PALETTE.slate },
  { name: 'Shopping', icon: 'shopping-bag', color: CATEGORY_PALETTE.plum },
  { name: 'Health', icon: 'heart-pulse', color: CATEGORY_PALETTE.rose },
  { name: 'Entertainment', icon: 'clapperboard', color: CATEGORY_PALETTE.indigo },
  { name: 'Travel', icon: 'plane', color: CATEGORY_PALETTE.teal },
  { name: 'Subscriptions', icon: 'repeat', color: CATEGORY_PALETTE.saffron },
  { name: 'Gifts', icon: 'gift', color: CATEGORY_PALETTE.olive },
  { name: 'Other', icon: 'circle-dashed', color: CATEGORY_PALETTE.slate },
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
