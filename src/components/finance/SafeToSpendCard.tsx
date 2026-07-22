import { Money } from '../ui/Money';
import { formatINR } from '../../lib/calculations';
import type { SafeToSpend } from '../../lib/calculations';
import { cn } from '../../lib/cn';

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
  dayOfMonth,
  daysInMonth,
}: {
  data: SafeToSpend;
  monthElapsed: number; // 0..1
  daysLeft: number;
  dayOfMonth: number;
  daysInMonth: number;
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

      {/* Month-pace bar, now labeled so it reads as "how far through the month",
          not "budget used". */}
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[10.5px] font-semibold uppercase tracking-[0.06em] opacity-80">
          <span>Month</span>
          <span className="tabular-nums">
            Day {dayOfMonth} of {daysInMonth}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-[color:var(--on-primary)] transition-[width] duration-500"
            style={{ width: `${Math.min(100, Math.round(monthElapsed * 100))}%` }}
          />
        </div>
      </div>

      {/* Supporting figures: larger, serif, full-contrast, hairline-divided. */}
      <div className="mt-4 grid grid-cols-2 gap-x-[18px] gap-y-3.5">
        <Stat label="Income" value={data.income} />
        <Stat label="Spent" value={data.spentSoFar} divideLeft />
        <Stat label="Bills to come" value={data.billsRemaining} divideTop />
        <Stat label="Goals set aside" value={data.goalSetAside} divideTop divideLeft />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  divideTop = false,
  divideLeft = false,
}: {
  label: string;
  value: number;
  divideTop?: boolean;
  divideLeft?: boolean;
}) {
  return (
    <div
      className={cn(
        divideTop && 'border-t border-white/[0.16] pt-3.5',
        divideLeft && 'border-l border-white/[0.16] pl-[18px]'
      )}
    >
      <div className="text-[11px] opacity-75">{label}</div>
      <Money paise={value} className="mt-0.5 block text-[17px]" />
    </div>
  );
}
