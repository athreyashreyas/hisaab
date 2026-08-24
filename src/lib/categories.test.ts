import { describe, expect, it } from 'vitest';
import {
  ACCENT_PALETTE,
  CATEGORY_PALETTE,
  DEFAULT_CATEGORIES,
  MERCHANT_RULES,
  SUGGESTED_CATEGORIES,
  guessCategory,
} from './categories';

describe('guessCategory', () => {
  it('files the everyday Indian merchants', () => {
    expect(guessCategory('Swiggy')).toBe('Food & dining');
    expect(guessCategory('BigBasket')).toBe('Groceries');
    expect(guessCategory('Uber')).toBe('Transport');
    expect(guessCategory('Amazon')).toBe('Shopping');
    expect(guessCategory('Netflix')).toBe('Subscriptions');
  });

  it('matches whatever the case and whatever else is in the string', () => {
    expect(guessCategory('SWIGGY INSTAMART BLR')).toBe('Food & dining');
    expect(guessCategory('  upi/zomato/ltd  ')).toBe('Food & dining');
  });

  it('puts fuel above transport, or petrol reads as a bus fare', () => {
    // "indian oil" and "petrol" would both be swallowed by the broad mobility
    // rule if the narrow one did not sit above it.
    expect(guessCategory('Indian Oil')).toBe('Fuel');
    expect(guessCategory('HP PETROL PUMP')).toBe('Fuel');
  });

  it('puts insurance and EMI above the broad bills rule', () => {
    expect(guessCategory('HDFC Life Insurance')).toBe('Insurance');
    expect(guessCategory('Bajaj Finserv EMI')).toBe('Loans & EMI');
  });

  it('holds short tokens to word boundaries', () => {
    // Bare `ola` hits "Sholay", bare `gas` hits "Gastro Pub", bare `rent` hits
    // "Parent" — each of which filed a spend under something absurd.
    expect(guessCategory('Sholay screening')).not.toBe('Transport');
    expect(guessCategory('Gastro Pub')).not.toBe('Rent & bills');
    expect(guessCategory('Parent teacher meeting')).not.toBe('Rent & bills');
    // The tokens themselves still match when they stand alone.
    expect(guessCategory('Ola')).toBe('Transport');
    expect(guessCategory('Gas cylinder')).toBe('Rent & bills');
    expect(guessCategory('Rent')).toBe('Rent & bills');
  });

  it('misses rather than guesses when nothing matches', () => {
    expect(guessCategory('Kiran general store')).toBeNull();
    expect(guessCategory('')).toBeNull();
    expect(guessCategory('   ')).toBeNull();
  });

  it('may name a category the user has not added, which simply misses', () => {
    // A rule is allowed to point at a SUGGESTED category; the screen filters.
    const names = new Set([...DEFAULT_CATEGORIES, ...SUGGESTED_CATEGORIES].map((c) => c.name));
    for (const rule of MERCHANT_RULES) {
      expect(names.has(rule.category)).toBe(true);
    }
  });
});

describe('the rule list', () => {
  it('is ordered so no rule is dead behind a broader one', () => {
    // First match wins, so a rule that can only ever be reached through an
    // earlier rule's pattern is a rule that will never fire.
    for (let i = 0; i < MERCHANT_RULES.length; i++) {
      const own = MERCHANT_RULES[i].pattern.source;
      const earlier = MERCHANT_RULES.slice(0, i);
      expect(earlier.some((r) => r.pattern.source === own)).toBe(false);
    }
  });

  it('matches case-insensitively, every one of them', () => {
    for (const rule of MERCHANT_RULES) {
      expect(rule.pattern.flags).toContain('i');
    }
  });

  it('carries no global flag, which would make matching stateful', () => {
    // A /g regex advances lastIndex between calls, so the same merchant would
    // match on one entry and miss on the next.
    for (const rule of MERCHANT_RULES) {
      expect(rule.pattern.flags).not.toContain('g');
    }
  });
});

describe('the palettes', () => {
  it('states every swatch as a six-digit hex', () => {
    for (const hex of [...Object.values(CATEGORY_PALETTE), ...ACCENT_PALETTE]) {
      expect(hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('lays out as two even rows of eight in the picker', () => {
    expect(Object.keys(CATEGORY_PALETTE)).toHaveLength(16);
    expect(ACCENT_PALETTE).toHaveLength(16);
  });

  it('has no duplicate swatch in either palette', () => {
    const cats = Object.values(CATEGORY_PALETTE).map((c) => c.toLowerCase());
    expect(new Set(cats).size).toBe(cats.length);
    const accents = ACCENT_PALETTE.map((c) => c.toLowerCase());
    expect(new Set(accents).size).toBe(accents.length);
  });

  it('opens the category palette with the validated colour-blind-safe six', () => {
    // Those six carry the common categories, so the everyday pie stays legible.
    expect(Object.keys(CATEGORY_PALETTE).slice(0, 6)).toEqual([
      'amber',
      'blue',
      'magenta',
      'lime',
      'lavender',
      'green',
    ]);
  });
});

describe('the seed categories', () => {
  it('gives every entry a name, an icon and a colour from the palette', () => {
    const swatches = new Set(Object.values(CATEGORY_PALETTE));
    for (const c of [...DEFAULT_CATEGORIES, ...SUGGESTED_CATEGORIES]) {
      expect(c.name.trim()).toBe(c.name);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.icon).toMatch(/^[a-z-]+$/); // lucide-react names are kebab-case
      expect(swatches.has(c.color)).toBe(true);
    }
  });

  it('names each category once, across both lists', () => {
    // The tray filters the suggestions by name; a name in both lists would be
    // offered as an add for something the user already has.
    const all = [...DEFAULT_CATEGORIES, ...SUGGESTED_CATEGORIES].map((c) => c.name);
    expect(new Set(all).size).toBe(all.length);
  });

  it('keeps "Other" last, on the reserved grey neutral', () => {
    const last = DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
    expect(last.name).toBe('Other');
    expect(last.color).toBe(CATEGORY_PALETTE.grey);
  });

  it('gives the six most common categories the colour-blind-safe hues', () => {
    const safeSix = new Set(
      ['amber', 'blue', 'magenta', 'lime', 'lavender', 'green'].map((k) => CATEGORY_PALETTE[k])
    );
    for (const name of ['Food & dining', 'Groceries', 'Transport', 'Shopping', 'Health']) {
      const seed = DEFAULT_CATEGORIES.find((c) => c.name === name);
      expect(safeSix.has(seed!.color)).toBe(true);
    }
  });

  it('keeps the add-expense grid short enough to scan', () => {
    // The wider library is one tap away in Settings; it does not belong in the
    // grid people tap through several times a day.
    expect(DEFAULT_CATEGORIES.length).toBeLessThanOrEqual(20);
  });
});
