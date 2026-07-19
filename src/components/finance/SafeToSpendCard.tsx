import { Money } from '../ui/Money';
import { formatINR } from '../../lib/calculations';
import type { SafeToSpend } from '../../lib/calculations';

/**
 * The teal-gradient hero — Hisaab's headline. The safe-to-spend figure is set big
 * in the serif face, with the per-day allowance, a month-elapsed bar, and a
 * four-up split (income / spent / bills to come / goals set aside). Mirrors
 * mockups/dashboard.html .hero.
 */
export function SafeToSpendCard({
  data,
  monthElapsed,
  daysLeft,
}: {
  data: SafeToSpend;
  monthElapsed: number; // 0..1
  daysLeft: number;
}) {
  const negative = data.amount < 0;

  return (
    <div className="relative overflow-hidden rounded-sheet bg-gradient-to-br from-teal-600 to-teal-500 p-5 text-[color:var(--on-primary)] shadow">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/[0.06]" />

      <div className="text-[12px] font-semibold uppercase tracking-[0.12em] opacity-80">
        Safe to spend
      </div>

      <div className="mt-1.5 flex items-baseline">
        {negative && <span className="mr-1 font-serif text-4xl">−</span>}
        <Money
          paise={Math.abs(data.amount)}
          showPaise
          className="text-[46px] leading-none"
          paiseClassName="text-[22px] opacity-70"
        />
      </div>

      <div className="mt-2.5 text-[13px] tabular-nums opacity-90">
        {negative
          ? `Over by ${formatINR(Math.abs(data.amount))} this month`
          : `${formatINR(data.perDayRemaining)} a day for the ${daysLeft} days left`}
      </div>

      <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-white/25">
        <div
          className="h-full rounded-full bg-[color:var(--on-primary)] transition-[width] duration-500"
          style={{ width: `${Math.min(100, Math.round(monthElapsed * 100))}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
        <Stat label="Income" value={data.income} />
        <Stat label="Spent" value={data.spentSoFar} />
        <Stat label="Bills to come" value={data.billsRemaining} />
        <Stat label="Goals set aside" value={data.goalSetAside} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-[11.5px] opacity-90">
      {label}
      <Money paise={value} className="mt-0.5 block text-[14px] font-semibold opacity-100" />
    </div>
  );
}
