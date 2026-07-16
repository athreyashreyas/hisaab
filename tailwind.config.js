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
        // Warm base, shared family DNA.
        parchment: {
          50: '#FDFCF9',
          100: '#FAF9F6',
          200: '#F0EDE6',
          300: '#E0DCD2',
        },
        ink: {
          900: '#1A1A18',
          700: '#3D3D38',
          500: '#6B6960',
          300: '#9B9890',
          100: '#D4D2CB',
        },
        // Hisaab's signature: a deep antique ledger teal. This is the brand /
        // primary / nav accent, the equivalent of Attend's sage and Harmony's
        // iris. Desaturated so it sits like aged ink on cream, not neon fintech.
        teal: {
          700: '#114A44',
          600: '#16615A',
          500: '#1E7F75',
          400: '#4BA096',
          300: '#86C0B8',
          100: '#D6E9E5',
          50: '#EFF6F4',
        },
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
