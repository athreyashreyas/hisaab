import { Icon } from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { formatINR } from '../../lib/calculations';
import type { CategoryPace } from '../../lib/calculations';
import type { Category } from '../../types';

/**
 * Per-category budget pacing bar. The fill is coloured by pace *status* (ok /
 * watch / over — spent-vs-time, not just spent-vs-total), and a faint tick marks
 * where the month has actually reached, so "ahead of pace" is visible at a glance.
 */
const statusColor: Record<CategoryPace['status'], string> = {
  ok: '#6E9B61',
  watch: '#C98F3E',
  over: '#B85C72',
};

const statusTone = { ok: 'ok', watch: 'watch', over: 'over' } as const;
const statusLabel = { ok: 'On pace', watch: 'Ahead of pace', over: 'Over budget' } as const;

export function PaceBar({ pace, category }: { pace: CategoryPace; category: Category }) {
  const color = statusColor[pace.status];
  const fill = Math.min(100, Math.round(pace.used * 100));
  const tick = Math.min(100, Math.round(pace.monthElapsed * 100));

  return (
    <div className="px-4 py-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className="grid h-6 w-6 place-items-center rounded-[7px]"
          style={{ backgroundColor: `${category.color}22`, color: category.color }}
        >
          <Icon name={category.icon} size={13} />
        </span>
        <span className="text-[13.5px] font-semibold text-ink-900">{category.name}</span>
        <Badge tone={statusTone[pace.status]} className="ml-auto">
          {statusLabel[pace.status]}
        </Badge>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-parchment-200">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${fill}%`, backgroundColor: color }} />
        <div className="absolute top-0 h-full w-px bg-ink-250/60" style={{ left: `${tick}%` }} title="Today" />
      </div>

      <div className="mt-1 flex justify-between text-[11.5px] tabular-nums text-ink-500">
        <span>{formatINR(pace.spent)} spent</span>
        <span>of {formatINR(pace.budget)}</span>
      </div>
    </div>
  );
}
