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
 * the pie stays legible for everyone; the remaining swatches extend the same
 * family for user choice. `grey` is the reserved neutral for "Other" /
 * uncategorised, never counted as a categorical hue.
 *
 * Sixteen swatches, so both pickers lay out as two even rows of eight.
 */

export const CATEGORY_PALETTE: Record<string, string> = {
  // The validated CVD-safe six.
  amber: '#C06E1C', // ₹200 bright yellow
  blue: '#1F7BA8', // ₹50 fluorescent blue
  magenta: '#C43E82', // ₹2,000 magenta
  lime: '#77871A', // ₹20 greenish-yellow
  lavender: '#8158C8', // ₹100 lavender
  green: '#3E7D3A', // note green
  // Extensions, same family, for the long tail of categories.
  teal: '#1E7F75', // brand
  emerald: '#2F7D62', // deep note green
  mustard: '#9A7B12', // aged ₹20
  clay: '#B5643C', // warm terracotta
  chocolate: '#8A5A3B', // ₹10 chocolate
  rose: '#B03A5B', // deep rose
  plum: '#6A4AA8', // deep ₹100
  indigo: '#2E5FA3', // deep ₹50
  slate: '#4A4F58', // ink slate
  grey: '#6B6E68', // ₹500 stone grey — neutral / Other
};

/**
 * Accent colours for accounts, goals and investments (kept separate from the
 * category list so accounts read as chips, not categories). Ordered as a spectrum
 * sweep — greens through ambers, reds, violets, blues, then the neutrals — so
 * picking one feels like running a finger along a paint strip rather than reading
 * an arbitrary list.
 */
export const ACCENT_PALETTE: string[] = [
  '#1E7F75', // teal (brand)
  '#2F7D62', // emerald
  '#3E7D3A', // green
  '#77871A', // ₹20 greenish-yellow
  '#9A7B12', // mustard
  '#C06E1C', // ₹200 amber
  '#B5643C', // clay
  '#8A5A3B', // ₹10 chocolate
  '#B03A5B', // rose
  '#C43E82', // ₹2,000 magenta
  '#6A4AA8', // plum
  '#8158C8', // ₹100 lavender
  '#2E5FA3', // indigo
  '#1F7BA8', // ₹50 blue
  '#4A4F58', // slate
  '#6B6E68', // ₹500 stone grey
];

export interface SeedCategory {
  name: string;
  icon: string; // lucide-react icon name
  color: string;
}

/**
 * Sensible India-first defaults. Users edit freely; these just make the empty
 * app usable on day one. Icons are lucide-react names.
 *
 * These are seeded on first run and backfilled onto existing accounts (see
 * backfillNewDefaultCategories), so anything added here lands for everyone.
 * Keep the list to the buckets nearly every household actually uses — the wider
 * set lives in SUGGESTED_CATEGORIES, one tap away, so the add-expense grid stays
 * short enough to scan. "Other" stays last.
 */
// The six most common categories take the validated CVD-safe hues (amber, blue,
// magenta, lime, lavender, green), so the everyday pie is legible for everyone.
// The long tail takes the extension swatches; "Other" takes the grey neutral.
export const DEFAULT_CATEGORIES: SeedCategory[] = [
  { name: 'Food & dining', icon: 'utensils', color: CATEGORY_PALETTE.amber },
  { name: 'Groceries', icon: 'shopping-basket', color: CATEGORY_PALETTE.lime },
  { name: 'Transport', icon: 'bus', color: CATEGORY_PALETTE.blue },
  { name: 'Fuel', icon: 'fuel', color: CATEGORY_PALETTE.chocolate },
  { name: 'Rent & bills', icon: 'receipt', color: CATEGORY_PALETTE.grey },
  { name: 'Shopping', icon: 'shopping-bag', color: CATEGORY_PALETTE.magenta },
  { name: 'Health', icon: 'heart-pulse', color: CATEGORY_PALETTE.green },
  { name: 'Personal care', icon: 'sparkles', color: CATEGORY_PALETTE.rose },
  { name: 'Fitness', icon: 'dumbbell', color: CATEGORY_PALETTE.emerald },
  { name: 'Entertainment', icon: 'clapperboard', color: CATEGORY_PALETTE.lavender },
  { name: 'Subscriptions', icon: 'repeat', color: CATEGORY_PALETTE.indigo },
  { name: 'Travel', icon: 'plane', color: CATEGORY_PALETTE.teal },
  { name: 'Education & learning', icon: 'graduation-cap', color: CATEGORY_PALETTE.plum },
  { name: 'Insurance', icon: 'shield', color: CATEGORY_PALETTE.slate },
  { name: 'Loans & EMI', icon: 'hand-coins', color: CATEGORY_PALETTE.mustard },
  { name: 'Family & support', icon: 'users', color: CATEGORY_PALETTE.clay },
  { name: 'Gifts', icon: 'gift', color: CATEGORY_PALETTE.magenta },
  { name: 'Other', icon: 'circle-dashed', color: CATEGORY_PALETTE.grey },
];

/**
 * The wider library, offered as one-tap adds in Settings → Categories rather than
 * seeded. Plenty of people want "Pets" or "Domestic help"; nobody wants all
 * thirty-odd buckets in the grid they tap through several times a day. Anything
 * already present (by name) is filtered out of the tray by the screen.
 */
export const SUGGESTED_CATEGORIES: SeedCategory[] = [
  { name: 'Mobile & internet', icon: 'smartphone', color: CATEGORY_PALETTE.blue },
  { name: 'Utilities', icon: 'zap', color: CATEGORY_PALETTE.amber },
  { name: 'Household & repairs', icon: 'wrench', color: CATEGORY_PALETTE.slate },
  { name: 'Domestic help', icon: 'hand-heart', color: CATEGORY_PALETTE.clay },
  { name: 'Kids', icon: 'baby', color: CATEGORY_PALETTE.lavender },
  { name: 'Pets', icon: 'paw-print', color: CATEGORY_PALETTE.chocolate },
  { name: 'Clothing', icon: 'shirt', color: CATEGORY_PALETTE.magenta },
  { name: 'Electronics & gadgets', icon: 'laptop', color: CATEGORY_PALETTE.indigo },
  { name: 'Books & stationery', icon: 'book-open', color: CATEGORY_PALETTE.emerald },
  { name: 'Festivals & celebrations', icon: 'party-popper', color: CATEGORY_PALETTE.rose },
  { name: 'Donations & charity', icon: 'heart', color: CATEGORY_PALETTE.green },
  { name: 'Taxes & fees', icon: 'landmark', color: CATEGORY_PALETTE.grey },
  { name: 'Cabs & rideshare', icon: 'car', color: CATEGORY_PALETTE.mustard },
  { name: 'Parking & tolls', icon: 'circle-parking', color: CATEGORY_PALETTE.slate },
  { name: 'Coffee & snacks', icon: 'coffee', color: CATEGORY_PALETTE.chocolate },
  { name: 'Eating out with friends', icon: 'wine', color: CATEGORY_PALETTE.plum },
  { name: 'Salon & grooming', icon: 'scissors', color: CATEGORY_PALETTE.rose },
  { name: 'Home & furniture', icon: 'sofa', color: CATEGORY_PALETTE.clay },
  { name: 'Savings & investments', icon: 'piggy-bank', color: CATEGORY_PALETTE.teal },
  { name: 'Medical & hospital', icon: 'stethoscope', color: CATEGORY_PALETTE.green },
];

/**
 * Rules-first auto-categorisation. Match a merchant string (lower-cased) to a
 * category name. Deterministic, no model needed — the right call for an 8GB
 * machine. Extend from the user's own history later (most-frequent category per
 * merchant beats any static list once there's data).
 *
 * Order matters: the first match wins, so the narrow rules (fuel, insurance)
 * sit above the broad ones they'd otherwise be swallowed by (transport, bills).
 * A rule may name a category that only exists in SUGGESTED_CATEGORIES; guessing
 * simply misses when the user hasn't added it, which is the right failure.
 */
export const MERCHANT_RULES: { pattern: RegExp; category: string }[] = [
  { pattern: /swiggy|zomato|third wave coffee|starbucks|cafe|restaurant|dominos|kfc|barbeque|biryani/i, category: 'Food & dining' },
  { pattern: /bigbasket|blinkit|zepto|dmart|grofers|reliance fresh|jiomart|more supermarket/i, category: 'Groceries' },
  // Fuel before transport: "indian oil" and "petrol" would otherwise be caught
  // by the broad mobility rule below and filed as Transport.
  { pattern: /petrol|diesel|hpcl|iocl|bpcl|\bfuel\b|indian oil|shell|nayara/i, category: 'Fuel' },
  // Short tokens get \b so they don't match inside a longer word: bare `ola`
  // hits "Sholay", bare `gas` hits "Gastro Pub", bare `rent` hits "Parent".
  { pattern: /uber|\bola\b|rapido|irctc|metro|namma yatri|redbus/i, category: 'Transport' },
  { pattern: /insurance|policybazaar|lic\b|hdfc life|icici pru|star health|acko|digit/i, category: 'Insurance' },
  { pattern: /\bemi\b|loan|repayment|bajaj finserv|home loan|credit card payment/i, category: 'Loans & EMI' },
  { pattern: /electricity|water|\bgas\b|broadband|airtel|jio|\bvi\b|bescom|\brent\b|maintenance/i, category: 'Rent & bills' },
  { pattern: /amazon|flipkart|myntra|ajio|nykaa|meesho|tatacliq/i, category: 'Shopping' },
  { pattern: /pharmacy|apollo|1mg|pharmeasy|hospital|clinic|practo|diagnostic|lab\b/i, category: 'Health' },
  { pattern: /salon|barber|spa\b|grooming|lakme|urban company/i, category: 'Personal care' },
  { pattern: /cult\.?fit|gym|fitness|decathlon|yoga/i, category: 'Fitness' },
  { pattern: /netflix|spotify|prime video|hotstar|youtube premium|bookmyshow|jiocinema|sonyliv/i, category: 'Subscriptions' },
  { pattern: /makemytrip|goibibo|indigo|vistara|oyo|airbnb|cleartrip|ixigo/i, category: 'Travel' },
  { pattern: /udemy|coursera|byju|unacademy|upgrad|vedantu|tuition|school|college|course|bookstore/i, category: 'Education & learning' },
];

/** Best-effort category name for a merchant string, or null if no rule matches. */
export function guessCategory(merchant: string): string | null {
  const m = merchant.trim();
  for (const rule of MERCHANT_RULES) if (rule.pattern.test(m)) return rule.category;
  return null;
}
