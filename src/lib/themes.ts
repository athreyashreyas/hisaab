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
    note: '',
    description: 'The house ink: a deep antique ledger teal on cream.',
    bg: '#faf9f6',
    accent: '#1e7f75',
  },
  {
    id: 'blue',
    name: 'Fifty Blue',
    note: '₹50',
    description: 'The fluorescent blue of a fifty, on cool paper.',
    bg: '#f3f7fa',
    accent: '#1f7ba8',
  },
  {
    id: 'lavender',
    name: 'Hundred Lavender',
    note: '₹100',
    description: 'The soft lavender of a hundred, on pale violet.',
    bg: '#f5f2fb',
    accent: '#7c5ac4',
  },
  {
    id: 'marigold',
    name: 'Two-hundred Marigold',
    note: '₹200',
    description: 'The warm marigold of a two-hundred, on sunlit cream.',
    bg: '#fdf7e9',
    accent: '#be7518',
  },
  {
    id: 'stone',
    name: 'Five-hundred Stone',
    note: '₹500',
    description: 'The quiet stone grey of a five-hundred.',
    bg: '#f5f5f1',
    accent: '#5e6e68',
  },
  {
    id: 'magenta',
    name: 'Two-thousand Magenta',
    note: '₹2000',
    description: 'The bold magenta of the two-thousand, on blush.',
    bg: '#fbf2f6',
    accent: '#c43e82',
  },
  {
    id: 'lime',
    name: 'Twenty Lime',
    note: '₹20',
    description: 'The greenish-yellow of a twenty, on warm green cream.',
    bg: '#f5f7e9',
    accent: '#6e8a1e',
  },
  {
    id: 'cocoa',
    name: 'Ten Cocoa',
    note: '₹10',
    description: 'The chocolate brown of a ten, on warm cream.',
    bg: '#f8f3eb',
    accent: '#8a5a3b',
  },
];

export const DEFAULT_THEME_ID = 'teal';

export function getTheme(id: string | null | undefined): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
