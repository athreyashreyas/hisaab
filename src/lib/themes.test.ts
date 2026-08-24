import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_ID, getTheme, THEMES } from './themes';

describe('getTheme', () => {
  it('finds a theme by its id', () => {
    expect(getTheme('blue').name).toBe('Blue');
  });

  it('falls back to the house default rather than returning nothing', () => {
    // The caller sets an attribute on <html> off this; undefined would leave
    // the page unthemed.
    expect(getTheme('a-theme-that-was-removed').id).toBe(DEFAULT_THEME_ID);
    expect(getTheme(null).id).toBe(DEFAULT_THEME_ID);
    expect(getTheme(undefined).id).toBe(DEFAULT_THEME_ID);
  });

  it('has a default that is actually in the catalogue', () => {
    expect(THEMES.some((t) => t.id === DEFAULT_THEME_ID)).toBe(true);
  });
});

describe('the catalogue', () => {
  it('gives every theme an id, a name, a description and two colours', () => {
    for (const t of THEMES) {
      expect(t.id).toMatch(/^[a-z-]+$/); // matches a :root[data-theme='id'] block
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.bg).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(t.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('uses each id once, so the picker cannot show two of the same', () => {
    const ids = THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every theme its own accent, so the swatches are told apart', () => {
    const accents = THEMES.map((t) => t.accent.toLowerCase());
    expect(new Set(accents).size).toBe(accents.length);
  });

  it('leads with the house default, and marks it as such rather than as a note', () => {
    expect(THEMES[0].id).toBe(DEFAULT_THEME_ID);
    expect(THEMES[0].note).toBe('Default');
  });

  it('names a banknote for every theme that alludes to one', () => {
    for (const t of THEMES.slice(1)) {
      expect(t.note).toMatch(/^₹[\d,]+ note$/);
    }
  });
});
