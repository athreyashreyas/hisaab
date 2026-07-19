import { motion } from 'framer-motion';
import type { GuideArtKind } from '../../lib/guide';
import { DENOMINATIONS } from '../../lib/denominations';

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

    // The banknote palette: each note's colour, and an amount wearing one.
    case 'denominations':
      return (
        <div className="w-full max-w-[250px]">
          <div className="flex items-baseline justify-center gap-1">
            <span className="font-serif text-2xl" style={{ color: '#1F7BA8', opacity: 0.7 }}>
              ₹
            </span>
            <span className="font-serif tabular-nums text-4xl" style={{ color: '#1F7BA8' }}>
              47
            </span>
          </div>
          <p className="mb-4 mt-1 text-center text-[10px] text-ink-300">reads in ₹50 blue</p>
          <div className="flex gap-1.5">
            {DENOMINATIONS.map((d, i) => (
              <motion.span
                key={d.value}
                className="flex-1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}
              >
                <span className="block h-8 rounded-[4px]" style={{ backgroundColor: d.color }} />
                <span className="mt-1 block text-center text-[8px] tabular-nums text-ink-300">
                  {d.value >= 1000 ? `${d.value / 1000}k` : d.value}
                </span>
              </motion.span>
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
            // name, category, amount, category tint, banknote-stripe colour
            ['Third Wave Coffee', 'Cafe', '420', ROSE, '#6B6E68'], // ₹420 → ₹500 grey
            ['Auto', 'Transport', '220', '#1F7BA8', '#6B6E68'], // ₹220 → ₹500 grey
            ['Refund', 'Income', '1,200', MOSS, '#C43E82'], // ₹1,200 → ₹2,000 magenta
          ].map(([name, cat, amt, color, note]) => (
            <div key={name} className="relative flex items-center gap-2.5 rounded-card bg-parchment-50 py-2 pl-3.5 pr-3 shadow-sm">
              <span
                aria-hidden="true"
                className="absolute inset-y-1.5 left-1 w-0.5 rounded-full"
                style={{ backgroundColor: note }}
              />
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

    // The portfolio: current value, and a couple of holdings with their gain.
    case 'investments':
      return (
        <div className="w-full max-w-[240px] space-y-2">
          <div className="rounded-card p-4 text-white shadow" style={{ backgroundColor: TEAL }}>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/60">Current value</p>
            <Rupee className="mt-0.5 block text-[26px] leading-none">2,84,600</Rupee>
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-white/85">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 17 17 7" /><path d="M8 7h9v9" />
              </svg>
              <Rupee>34,600</Rupee> <span className="text-white/60">(+13.8%)</span>
            </p>
          </div>
          {[
            ['Reliance', 'Stock', '+18%', MOSS],
            ['HDFC FD', '7.1% p.a.', '+7%', TEAL_400],
          ].map(([name, kind, ret, color]) => (
            <div key={name} className="flex items-center gap-2.5 rounded-card bg-parchment-50 px-3 py-2 shadow-sm">
              <span className="h-6 w-6 shrink-0 rounded-[8px]" style={{ backgroundColor: `${color}26` }} />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-ink-900">{name}</span>
                <span className="block text-[9px] text-ink-300">{kind}</span>
              </span>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: MOSS }}>
                {ret}
              </span>
            </div>
          ))}
        </div>
      );

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

    // Recurring: a scheduled bill with its cadence, over the "every N" control.
    case 'recurring':
      return (
        <div className="w-full max-w-[240px] space-y-2.5">
          <div className="flex items-center gap-2.5 rounded-card bg-parchment-50 px-3 py-2.5 shadow-sm">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px]" style={{ backgroundColor: `${AMBER}1f`, color: AMBER }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 2l4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-ink-900">Netflix</span>
              <span className="block text-[9px] text-ink-300">Every 2 weeks · next 12 Aug</span>
            </span>
            <Rupee className="text-[11px] text-ink-900">499</Rupee>
          </div>
          <div className="flex items-center gap-2 rounded-card bg-parchment-200 px-3 py-2">
            <span className="text-[10px] font-semibold text-ink-500">Every</span>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-parchment-50 text-ink-500 shadow-sm">−</span>
              <span className="min-w-[4ch] text-center text-[11px] font-semibold tabular-nums text-ink-900">2 weeks</span>
              <span className="grid h-6 w-6 place-items-center rounded-full bg-parchment-50 text-ink-500 shadow-sm">+</span>
            </span>
          </div>
          <div className="flex gap-1 rounded-full bg-parchment-200 p-0.5 text-[9px] font-semibold">
            {['Day', 'Week', 'Month', 'Year'].map((l, i) => (
              <span
                key={l}
                className={
                  i === 1
                    ? 'flex-1 rounded-full bg-parchment-50 py-1 text-center text-teal-700 shadow-sm'
                    : 'flex-1 py-1 text-center text-ink-300'
                }
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      );

    // The banknote themes: each note's accent over its tinted paper.
    case 'themes':
      return (
        <div className="w-full max-w-[250px]">
          <div className="grid grid-cols-4 gap-2">
            {[
              ['Teal', '#faf9f6', '#1e7f75'],
              ['₹50', '#f3f7fa', '#1f7ba8'],
              ['₹100', '#f5f2fb', '#7c5ac4'],
              ['₹200', '#fdf7e9', '#be7518'],
              ['₹500', '#f1f5ef', '#647a5e'],
              ['₹2000', '#fbf2f6', '#c43e82'],
              ['₹20', '#f5f7e9', '#6e8a1e'],
              ['₹10', '#f8f3eb', '#8a5a3b'],
            ].map(([label, bg, accent], i) => (
              <motion.div
                key={label}
                className="flex flex-col items-center gap-1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 + i * 0.05 }}
              >
                <span
                  className="grid h-11 w-11 place-items-center rounded-[10px] shadow-sm"
                  style={{ backgroundColor: bg }}
                >
                  <span className="h-6 w-6 rounded-full" style={{ backgroundColor: accent }} />
                </span>
                <span className="text-[8.5px] text-ink-300">{label}</span>
              </motion.div>
            ))}
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
              <span>Third Wave Coffee</span>
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
