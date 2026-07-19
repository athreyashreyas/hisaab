import { create } from 'zustand';
import { DEFAULT_THEME_ID, getTheme, THEMES } from './themes';

/**
 * Theme selection. Applying a theme is one attribute on <html>; all colour
 * cascades from the CSS variables in tokens.css. It's a per-device preference
 * (like a wallpaper), kept in localStorage so it survives reloads and is applied
 * before first paint — an inline snippet in index.html sets the attribute even
 * before this bundle loads, so there's never a flash of the default theme.
 */
const STORAGE_KEY = 'hisaab.theme';

function readStored(): string {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && THEMES.some((t) => t.id === v)) return v;
  } catch {
    // ignore (private mode / disabled storage)
  }
  return DEFAULT_THEME_ID;
}

export function applyTheme(id: string): void {
  const theme = getTheme(id);
  document.documentElement.setAttribute('data-theme', theme.id);
  // Keep the mobile status-bar tint in step with the theme's resting paper.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.bg);
}

/** Called once, very early (main.tsx), so the store and <meta> agree with the
 *  attribute the inline index.html snippet already set before first paint. */
export function initTheme(): void {
  applyTheme(readStored());
}

interface ThemeState {
  themeId: string;
  setTheme: (id: string) => void;
}

export const useTheme = create<ThemeState>((set) => ({
  themeId: readStored(),
  setTheme: (id) => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
    applyTheme(id);
    set({ themeId: id });
  },
}));
