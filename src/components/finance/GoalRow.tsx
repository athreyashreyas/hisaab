import { format } from 'date-fns';
import { ProgressRing } from '../ui/ProgressRing';
import { Money } from '../ui/Money';
import { formatINR, cadenceLabel } from '../../lib/calculations';
import { PACE_TONE, type GoalPace } from '../../lib/goals';
import type { Goal } from '../../types';
import { cn } from '../../lib/cn';

/**
 * A goal line: conic progress ring, name, pace verdict, and saved/target.
 * Mirrors mockups/dashboard.html .goal.
 */
export function GoalRow({
  goal,
  pace,
  onClick,
  className,
}: {
  goal: Goal;
  pace: GoalPace;
  onClick?: () => void;
  className?: string;
}) {
  const pct = Math.round(pace.progress * 100);

  return (
    <button
      onClick={onClick}
      className={cn('flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-parchment-100', className)}
    >
      <ProgressRing progress={pace.progress} color={goal.color} label={`${pct}%`} />

      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-semibold text-ink-900">{goal.name}</div>
        <div className="mt-0.5 truncate text-[12px] tabular-nums">
          <GoalMeta goal={goal} pace={pace} />
        </div>
      </div>

      <div className="shrink-0 text-right">
        <Money paise={goal.saved} className="text-[14px] font-semibold text-ink-900" />
        <div className="mt-0.5 text-[11px] tabular-nums text-ink-300">of {formatShort(goal.target)}</div>
      </div>
    </button>
  );
}

/**
 * The one-line verdict. Every GoalPaceState gets its own sentence — the point of
 * enumerating them is that no goal falls back to a generic line that's wrong for
 * its situation ("Behind" on a goal created ten seconds ago, say).
 */
export function GoalMeta({ goal, pace }: { goal: Goal; pace: GoalPace }) {
  const tone = PACE_TONE[pace.state];
  const cls = tone.className;

  switch (pace.state) {
    case 'reached':
      return <span className={cls}>Reached · well done</span>;

    case 'ahead':
      return (
        <span className={cls}>
          Ahead
          {pace.driftPayments >= 1
            ? ` by ${pace.driftPayments} payment${pace.driftPayments === 1 ? '' : 's'}`
            : pace.drift > 0
              ? ` by ${formatShort(pace.drift)}`
              : ''}
        </span>
      );

    case 'on-track':
      return (
        <span className={cls}>
          On track
          {pace.dueThisMonth > 0 && (
            <span className="text-ink-500"> · {formatShort(pace.dueThisMonth)} left this month</span>
          )}
        </span>
      );

    case 'behind': {
      const short = Math.abs(pace.drift);
      const missed = Math.abs(pace.driftPayments);
      return (
        <span className={cls}>
          Behind by {missed >= 1 ? `${missed} payment${missed === 1 ? '' : 's'}` : formatShort(short)}
        </span>
      );
    }

    case 'overdue':
      return (
        <span className={cls}>
          Date passed · {formatShort(pace.remaining)} to go
        </span>
      );

    case 'upcoming':
      if (pace.nextDue) {
        return (
          <span className={cls}>
            Starts {format(pace.nextDue, 'd MMM')} · {formatShort(goal.plan_amount ?? 0)}{' '}
            {goal.plan_cadence ? cadenceLabel(goal.plan_cadence, goal.plan_interval).toLowerCase() : ''}
          </span>
        );
      }
      return (
        <span className={cls}>
          Nothing added yet
          {pace.requiredPerMonth ? ` · ${formatShort(pace.requiredPerMonth)}/mo to hit it` : ''}
        </span>
      );

    case 'unplanned':
    default:
      if (pace.etaDate) {
        return (
          <span className="text-ink-500">
            About {new Date(pace.etaDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          </span>
        );
      }
      return <span className="text-ink-500">Add a date or a plan to track pace</span>;
  }
}

/** The compact state badge, for cards and headers. */
export function PaceChip({ pace, className }: { pace: GoalPace; className?: string }) {
  const tone = PACE_TONE[pace.state];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.05em]',
        tone.chipClassName,
        className
      )}
    >
      {tone.label}
    </span>
  );
}

/**
 * Compact money for tight spots: ₹1.2L, ₹34k. Amounts under ₹1,000 fall through
 * to the full format so their paise survive — "₹99" for a ₹99.50 top-up would be
 * the one place in the app where a figure quietly loses money.
 */
export function formatShort(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const r = abs / 100;
  if (r >= 1e7) return `${sign}₹${(r / 1e7).toFixed(2)}Cr`;
  if (r >= 1e5) return `${sign}₹${(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `${sign}₹${(r / 1e3).toFixed(0)}k`;
  return `${sign}${formatINR(abs)}`;
}
