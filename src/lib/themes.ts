/**
 * The theme catalogue. Each entry pairs an id (matching a :root[data-theme='id']
 * block in tokens.css) with what the UI needs: a name, the note it alludes to, a
 * one-line description, and two representative colours for the settings swatch
 * and the status-bar tint. The colour VALUES live in tokens.css; this is just the
 * catalogue, in the order the picker shows them.
 *
 * ADDING A THEME: add a block in tokens.css and one entry here. That's it.
 */
export interface ThemeMeta {
  id: string;
  name: string;
  /** The banknote it alludes to, e.g. "₹50". Empty for the house default. */
  note: string;
  description: string;
  /** Resting paper (parchment-100) — also the status-bar tint. */
  bg: string;
  /** Brand accent (teal-500). */
  accent: string;
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'teal',
    name: 'Ledger Teal',
    note: 'Default',
    description: 'The house ink: a deep antique ledger teal on cream.',
    bg: '#faf9f6',
    accent: '#1e7f75',
  },
  {
    id: 'cocoa',
    name: 'Cocoa',
    note: '₹10 note',
    description: 'The chocolate brown of a ten, on warm cream.',
    bg: '#f8f3eb',
    accent: '#8a5a3b',
  },
  {
    id: 'lime',
    name: 'Lime',
    note: '₹20 note',
    description: 'The greenish-yellow of a twenty, on warm green cream.',
    bg: '#f5f7e9',
    accent: '#6e8a1e',
  },
  {
    id: 'blue',
    name: 'Blue',
    note: '₹50 note',
    description: 'The fluorescent blue of a fifty, on cool paper.',
    bg: '#f3f7fa',
    accent: '#1f7ba8',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    note: '₹100 note',
    description: 'The soft lavender of a hundred, on pale violet.',
    bg: '#f5f2fb',
    accent: '#7c5ac4',
  },
  {
    id: 'marigold',
    name: 'Marigold',
    note: '₹200 note',
    description: 'The warm marigold of a two-hundred, on sunlit cream.',
    bg: '#fdf7e9',
    accent: '#be7518',
  },
  {
    id: 'stone',
    name: 'Olive',
    note: '₹500 note',
    description: 'The olive-grey green of a five-hundred.',
    bg: '#f1f5ef',
    accent: '#647a5e',
  },
  {
    id: 'magenta',
    name: 'Magenta',
    note: '₹2000 note',
    description: 'The bold magenta of the two-thousand, on blush.',
    bg: '#fbf2f6',
    accent: '#c43e82',
  },
];

export const DEFAULT_THEME_ID = 'teal';

export function getTheme(id: string | null | undefined): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
