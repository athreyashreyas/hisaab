import { describe, expect, it } from 'vitest';
import { DENOMINATIONS, denominationColor, denominationFor } from './denominations';

describe('denominationFor', () => {
  it('picks the smallest note that would cover the spend', () => {
    // The colour answers "which note is this?" the way you'd actually think
    // about it: ₹47 is a fifty, ₹1,800 is a two-thousand.
    expect(denominationFor(47_00).value).toBe(50);
    expect(denominationFor(1_800_00).value).toBe(2000);
    expect(denominationFor(120_00).value).toBe(200);
  });

  it('treats a note at exactly its face value as covered by that note', () => {
    for (const d of DENOMINATIONS) {
      expect(denominationFor(d.value * 100).value).toBe(d.value);
    }
  });

  it('steps up at one paise over a face value', () => {
    expect(denominationFor(50_00).value).toBe(50);
    expect(denominationFor(50_01).value).toBe(100);
  });

  it('rests on the smallest note for zero and for an empty pad', () => {
    expect(denominationFor(0).value).toBe(10);
  });

  it('ignores the sign, so a refund reads as its own size', () => {
    expect(denominationFor(-47_00).value).toBe(denominationFor(47_00).value);
    expect(denominationFor(-1).value).toBe(denominationFor(1).value);
  });

  it('caps at the largest note once the amount runs past it', () => {
    expect(denominationFor(50_000_00).value).toBe(2000);
    expect(denominationFor(1_00_00_000_00).value).toBe(2000);
  });

  it('gives a sub-rupee amount the smallest note rather than the fallback path', () => {
    // 50 paise is above zero, so it takes the ₹10 band by the covering rule
    // rather than by the empty-amount fallback — same colour, different reason.
    expect(denominationFor(50).value).toBe(10);
  });
});

describe('the palette itself', () => {
  it('is ordered small to large, which is what makes the scan terminate correctly', () => {
    const values = DENOMINATIONS.map((d) => d.value);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });

  it('gives every note a distinct colour', () => {
    const colors = DENOMINATIONS.map((d) => d.color.toLowerCase());
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('states each colour as a hex and each tint as a translucent rgba', () => {
    for (const d of DENOMINATIONS) {
      expect(d.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(d.tint).toMatch(/^rgba\(\d+,\d+,\d+,0\.\d+\)$/);
    }
  });

  it('labels each note with its rupee figure', () => {
    expect(DENOMINATIONS.map((d) => d.label)).toEqual([
      '₹10',
      '₹20',
      '₹50',
      '₹100',
      '₹200',
      '₹500',
      '₹2,000',
    ]);
  });
});

describe('denominationColor', () => {
  it('is the colour of the note the amount lands on', () => {
    expect(denominationColor(47_00)).toBe(denominationFor(47_00).color);
    expect(denominationColor(0)).toBe(DENOMINATIONS[0].color);
  });
});
