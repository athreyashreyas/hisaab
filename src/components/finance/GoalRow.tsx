import { ProgressRing } from '../ui/ProgressRing';
import { Money } from '../ui/Money';
import { goalProjection, type GoalProjection } from '../../lib/calculations';
import type { Goal } from '../../types';
import { cn } from '../../lib/cn';

/**
 * A goal line: conic progress ring, name, on-track / behind meta, and saved/target.
 * `ratePerMonth` (recent contribution run-rate) drives the projection line.
 * Mirrors mockups/dashboard.html .goal.
 */
export function GoalRow({
  goal,
  ratePerMonth,
  onClick,
  className,
}: {
  goal: Goal;
  ratePerMonth: number;
  onClick?: () => void;
  className?: string;
}) {
  const proj = goalProjection(goal, ratePerMonth);
  const pct = Math.round(proj.progress * 100);

  return (
    <button
      onClick={onClick}
      className={cn('flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-parchment-100', className)}
    >
      <ProgressRing progress={proj.progress} color={goal.color} label={`${pct}%`} />

      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-semibold text-ink-900">{goal.name}</div>
        <div className="mt-0.5 truncate text-[12px] tabular-nums">
          <GoalMeta goal={goal} proj={proj} />
        </div>
      </div>

      <div className="shrink-0 text-right">
        <Money paise={goal.saved} className="text-[14px] font-semibold text-ink-900" />
        <div className="mt-0.5 text-[11px] tabular-nums text-ink-300">of {formatShort(goal.target)}</div>
      </div>
    </button>
  );
}

export function GoalMeta({ goal, proj }: { goal: Goal; proj: GoalProjection }) {
  if (proj.progress >= 1) return <span className="text-moss-600">Reached · well done</span>;

  if (goal.target_date) {
    if (proj.onTrack) return <span className="text-moss-600">On track</span>;
    return (
      <span className="text-amber-600">Behind · needs {formatShort(proj.neededPerMonth ?? 0)}/mo</span>
    );
  }
  if (proj.etaDate) {
    return (
      <span className="text-ink-500">
        About {new Date(proj.etaDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
      </span>
    );
  }
  return <span className="text-ink-500">Start saving to see a target</span>;
}

export function formatShort(paise: number): string {
  const r = paise / 100;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `₹${(r / 1e3).toFixed(0)}k`;
  return `₹${Math.round(r)}`;
}
