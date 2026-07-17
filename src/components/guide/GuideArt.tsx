import { motion } from 'framer-motion';
import type { GuideArtKind } from '../../lib/guide';

/**
 * The guide's small illustrations, so each section shows what it's describing
 * rather than only telling. Same idea as Harmony's GuideArt, drawn in Hisaab's
 * ledger-teal palette and about money rather than habits.
 *
 * These are miniatures of real surfaces in the app (the safe-to-spend card, a
 * ledger day, the goal ring), not generic clip-art, so the guide reads as a
 * preview of the thing itself. Keep them token-coloured and flat: no blend
 * modes, no photos, nothing that needs a specific background to look right.
 */

const TEAL = '#1E7F75';
const TEAL_400 = '#4BA096';
const MOSS = '#6E9B61';
const ROSE = '#B85C72';
const AMBER = '#C98F3E';

/** Money as it renders in the app: serif, tabular, grouped the Indian way. */
function Rupee({
  children,
  className = '',
  style,
}: {
  children: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`font-serif tabular-nums ${className}`} style={style}>
      ₹{children}
    </span>
  );
}

export function GuideArt({ kind }: { kind: GuideArtKind }) {
  switch (kind) {
    // The real app icon, the one that ends up on the home screen.
    case 'logo':
      return (
        <img
          src="/icon-192.png"
          alt="Hisaab"
          width={84}
          height={84}
          className="shadow"
          style={{ borderRadius: '21px' }}
        />
      );

    // A miniature of Home's teal hero card: the one number, the month bar, and
    // the four-up split that explains where it came from.
    case 'safeToSpend':
      return (
        <div className="w-full max-w-[260px] rounded-card p-4 text-white shadow" style={{ backgroundColor: TEAL }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">Safe to spend</p>
          <Rupee className="mt-1 block text-[32px] leading-none">24,860</Rupee>
          <p className="mt-1 text-[11px] text-white/70">
            <Rupee>1,776</Rupee> a day for 14 days left
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
            <motion.div
              className="h-full rounded-full bg-white/80"
              initial={{ width: '0%' }}
              animate={{ width: '55%' }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
            />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1 border-t border-white/15 pt-2.5 text-center">
            {[
              ['In', '82k'],
              ['Spent', '41k'],
              ['Bills', '9k'],
              ['Goals', '7k'],
            ].map(([label, value]) => (
              <span key={label}>
                <span className="block text-[9px] uppercase tracking-wide text-white/50">{label}</span>
                <Rupee className="block text-[12px] text-white/90">{value}</Rupee>
              </span>
            ))}
          </div>
        </div>
      );

    // The add sheet's amount pad: the figure grows as you type, and the type
    // toggle sits above it.
    case 'adding':
      return (
        <div className="w-full max-w-[220px] rounded-sheet bg-parchment-50 p-4 shadow">
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-parchment-300" />
          <div className="mb-3 flex gap-1 rounded-full bg-parchment-200 p-0.5 text-[10px] font-semibold">
            <span className="flex-1 rounded-full bg-parchment-50 py-1 text-center text-ink-900 shadow-sm">Expense</span>
            {['Income', 'Transfer'].map((l) => (
              <span key={l} className="flex-1 py-1 text-center text-ink-300">
                {l}
              </span>
            ))}
          </div>
          <Rupee className="block text-center text-[30px] leading-none" >420</Rupee>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {['1', '2', '3', '4', '5', '6'].map((k) => (
              <span
                key={k}
                className="grid h-7 place-items-center rounded-[7px] bg-parchment-100 text-[12px] font-semibold text-ink-700"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      );

    // A day in the ledger: grouped under its date, with a running day total.
    case 'ledger':
      return (
        <div className="w-full max-w-[240px] space-y-1.5">
          <div className="flex items-baseline justify-between px-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-300">Today</span>
            <Rupee className="text-[11px] text-ink-500">640</Rupee>
          </div>
          {[
            ['Blue Tokai', 'Cafe', '420', ROSE],
            ['Auto', 'Transport', '220', ROSE],
            ['Refund', 'Income', '1,200', MOSS],
          ].map(([name, cat, amt, color]) => (
            <div key={name} className="flex items-center gap-2.5 rounded-card bg-parchment-50 px-3 py-2 shadow-sm">
              <span className="h-6 w-6 shrink-0 rounded-full" style={{ backgroundColor: `${color}26` }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold text-ink-900">{name}</span>
                <span className="block text-[9px] text-ink-300">{cat}</span>
              </span>
              <Rupee className="text-[11px]" style={{ color }}>
                {amt}
              </Rupee>
            </div>
          ))}
        </div>
      );

    // Cash and digital, each with its own balance.
    case 'accounts':
      return (
        <div className="w-full max-w-[240px] space-y-1.5">
          {[
            ['Cash', 'Wallet', '4,200', AMBER],
            ['HDFC', 'Bank', '68,400', TEAL],
            ['Amex', 'Card', '12,900', '#3E7CA1'],
          ].map(([name, kind, amt, color]) => (
            <div key={name} className="flex items-center gap-2.5 rounded-card bg-parchment-50 px-3 py-2.5 shadow-sm">
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] font-serif text-[12px]"
                style={{ backgroundColor: `${color}1f`, color }}
              >
                ₹
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-ink-900">{name}</span>
                <span className="block text-[9px] text-ink-300">{kind}</span>
              </span>
              <Rupee className="text-[12px] text-ink-900">{amt}</Rupee>
            </div>
          ))}
        </div>
      );

    // The goal ring, filling to its progress the way it does on the Goals tab.
    case 'goals': {
      const pct = 0.68;
      const r = 34;
      const c = 2 * Math.PI * r;
      return (
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 84 84" className="h-24 w-24 shrink-0" aria-hidden="true">
            <circle cx="42" cy="42" r={r} fill="none" stroke="#E0DCD2" strokeWidth="8" />
            <motion.circle
              cx="42"
              cy="42"
              r={r}
              fill="none"
              stroke={TEAL}
              strokeWidth="8"
              strokeLinecap="round"
              transform="rotate(-90 42 42)"
              strokeDasharray={c}
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: c * (1 - pct) }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
            />
            <text
              x="42"
              y="43"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="'DM Serif Display', Georgia, serif"
              fontSize="17"
              fill="#1A1A18"
            >
              68%
            </text>
          </svg>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-ink-900">Kerala trip</p>
            <Rupee className="mt-0.5 block text-[15px] text-ink-900">34,000</Rupee>
            <p className="text-[10px] text-ink-300">
              of <Rupee>50,000</Rupee>
            </p>
            <p className="mt-1.5 text-[10px]" style={{ color: MOSS }}>
              On track for March
            </p>
          </div>
        </div>
      );
    }

    // Insights: the trend line over time, plus category pacing bars.
    case 'insights':
      return (
        <div className="w-full max-w-[240px]">
          <div className="mb-2 flex gap-1 rounded-full bg-parchment-200 p-0.5 text-[9px] font-semibold">
            <span className="flex-1 rounded-full bg-parchment-50 py-1 text-center text-ink-900 shadow-sm">Month</span>
            {['Week', 'Day'].map((l) => (
              <span key={l} className="flex-1 py-1 text-center text-ink-300">
                {l}
              </span>
            ))}
          </div>
          <div className="rounded-card bg-parchment-50 p-3 shadow-sm">
            <svg viewBox="0 0 200 56" width="100%" height="44" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="hisaab-guide-trend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TEAL} stopOpacity="0.26" />
                  <stop offset="100%" stopColor={TEAL} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M4 42 L36 28 L68 33 L100 15 L132 24 L164 11 L196 18 L196 52 L4 52 Z" fill="url(#hisaab-guide-trend)" />
              <path
                d="M4 42 L36 28 L68 33 L100 15 L132 24 L164 11 L196 18"
                fill="none"
                stroke={TEAL}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className="mt-2.5 space-y-1.5 border-t border-parchment-200 pt-2.5">
              {[
                ['Food', 0.82, AMBER],
                ['Transport', 0.44, TEAL_400],
                ['Shopping', 1, ROSE],
              ].map(([label, pct, color]) => (
                <div key={label as string} className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-[9px] text-ink-500">{label as string}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-parchment-200">
                    <motion.span
                      className="block h-full rounded-full"
                      style={{ backgroundColor: color as string }}
                      initial={{ width: '0%' }}
                      animate={{ width: `${(pct as number) * 100}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    // What actually leaves the phone: your row, sealed into ciphertext.
    case 'security':
      return (
        <div className="w-full max-w-[250px] space-y-2">
          <div className="rounded-card bg-parchment-50 px-3 py-2 shadow-sm">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-ink-300">On your phone</p>
            <p className="mt-1 flex items-baseline justify-between text-[11px] font-semibold text-ink-900">
              <span>Blue Tokai</span>
              <Rupee>420</Rupee>
            </p>
          </div>
          <div className="flex justify-center">
            <span className="grid h-7 w-7 place-items-center rounded-full" style={{ backgroundColor: `${TEAL}1f` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </span>
          </div>
          <div className="rounded-card px-3 py-2" style={{ backgroundColor: '#F0EDE6' }}>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-ink-300">On the server</p>
            <p className="mt-1 break-all font-mono text-[9px] leading-relaxed text-ink-300">
              9f2ac41d8e73b06a5c1f4e29d7b80a3c6e15f9d2ab47c308
            </p>
          </div>
        </div>
      );

    // The three states the dot can be in, in the order they read.
    case 'sync':
      return (
        <div className="flex items-center gap-5">
          {[
            ['#9B9890', 'On device'],
            [TEAL_400, 'Backing up'],
            [TEAL, 'Backed up'],
          ].map(([color, label]) => (
            <span key={label} className="flex flex-col items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[9px] text-ink-300">{label}</span>
            </span>
          ))}
        </div>
      );
  }
}
