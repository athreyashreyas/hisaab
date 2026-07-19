import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Shared with the suite (Attend, Harmony): editorial serif + humanist sans.
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Themed tokens resolve from CSS variables (see src/tokens.css) as
        // rgb(var(--x-rgb) / <alpha>), so utilities and their opacity modifiers
        // (bg-teal-500/20) re-theme when <html data-theme> changes. The values
        // themselves live in tokens.css; a theme is one block there.
        parchment: {
          50: 'rgb(var(--parchment-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--parchment-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--parchment-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--parchment-300-rgb) / <alpha-value>)',
        },
        ink: {
          900: 'rgb(var(--ink-900-rgb) / <alpha-value>)',
          700: 'rgb(var(--ink-700-rgb) / <alpha-value>)',
          500: 'rgb(var(--ink-500-rgb) / <alpha-value>)',
          300: 'rgb(var(--ink-300-rgb) / <alpha-value>)',
          100: 'rgb(var(--ink-100-rgb) / <alpha-value>)',
        },
        // Hisaab's signature: a deep antique ledger teal by default, re-skinned
        // to a banknote hue by each theme. Still named `teal` across the app so
        // the class names never change; only the values behind them do.
        teal: {
          700: 'rgb(var(--teal-700-rgb) / <alpha-value>)',
          600: 'rgb(var(--teal-600-rgb) / <alpha-value>)',
          500: 'rgb(var(--teal-500-rgb) / <alpha-value>)',
          400: 'rgb(var(--teal-400-rgb) / <alpha-value>)',
          300: 'rgb(var(--teal-300-rgb) / <alpha-value>)',
          100: 'rgb(var(--teal-100-rgb) / <alpha-value>)',
          50: 'rgb(var(--teal-50-rgb) / <alpha-value>)',
        },
        // The readable text colour on a teal-filled surface (buttons, the
        // safe-to-spend hero). Themed alongside the accent.
        'on-primary': 'rgb(var(--on-primary-rgb) / <alpha-value>)',
        // Money income / positive delta (kept distinct from teal so "up" never
        // reads as "brand"). Muted moss.
        moss: {
          600: '#4F7942',
          500: '#6E9B61',
          100: '#E8F0E6',
        },
        // Overspend / over budget / negative safe-to-spend.
        rose: {
          600: '#A14A5E',
          500: '#B85C72',
          100: '#F3E2E6',
        },
        // Pacing caution (approaching a budget limit).
        amber: {
          600: '#B8782A',
          500: '#C98F3E',
          100: '#F5E9D6',
        },
      },
      borderRadius: {
        card: '12px',
        sheet: '16px',
        fab: '24px',
      },
      boxShadow: {
        // Warm-tinted shadows (rgba(35,25,15)) so they read as depth on
        // parchment rather than neutral grey. Matches Attend.
        sm: '0 1px 3px 0 rgba(35,25,15,0.08), 0 1px 2px -1px rgba(35,25,15,0.04)',
        DEFAULT:
          '0 4px 6px -1px rgba(35,25,15,0.08), 0 2px 4px -2px rgba(35,25,15,0.04)',
        lg: '0 10px 15px -3px rgba(35,25,15,0.08), 0 4px 6px -4px rgba(35,25,15,0.04)',
        xl: '0 20px 25px -5px rgba(35,25,15,0.10), 0 8px 10px -6px rgba(35,25,15,0.04)',
        '2xl': '0 25px 50px -12px rgba(35,25,15,0.18)',
      },
      fontVariantNumeric: {
        // Money must line up in columns. Applied via .tabular-nums utility.
        tabular: 'tabular-nums',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [forms],
};
