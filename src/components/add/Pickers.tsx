import { Minus, Plus } from 'lucide-react';
import { Icon } from '../ui/Icon';
import type { Account, Category, Cadence } from '../../types';
import { cadenceLabel } from '../../lib/calculations';
import { cn } from '../../lib/cn';

/** Segmented control (type toggle, and reused elsewhere). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-card bg-parchment-200 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-[9px] py-2 text-sm font-semibold transition-colors',
            value === o.value ? 'bg-parchment-50 text-teal-700 shadow-sm' : 'text-ink-500'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const CADENCE_UNITS: { value: Cadence; label: string }[] = [
  { value: 'daily', label: 'Day' },
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
  { value: 'yearly', label: 'Year' },
];

const MAX_INTERVAL = 99;

/**
 * Cadence picker for recurring payments — an in-app control (never an OS
 * picker). A unit row (day/week/month/year) sits over an "every N" stepper, so
 * the user can schedule any cadence they like: weekly, or every 2 weeks, or
 * every 3 months. Every tap applies immediately; there is nothing to confirm.
 * The live caption reads back the plain-English cadence ("Every 2 weeks").
 */
export function CadencePicker({
  cadence,
  interval,
  onCadence,
  onInterval,
}: {
  cadence: Cadence;
  interval: number;
  onCadence: (c: Cadence) => void;
  onInterval: (n: number) => void;
}) {
  const n = Math.max(1, Math.round(interval));
  const unit = CADENCE_UNITS.find((u) => u.value === cadence)?.label.toLowerCase() ?? 'time';
  const clamp = (v: number) => Math.min(MAX_INTERVAL, Math.max(1, v));

  return (
    <div className="space-y-2.5">
      <Segmented options={CADENCE_UNITS} value={cadence} onChange={onCadence} />
      <div className="flex items-center gap-3 rounded-card bg-parchment-200 px-3 py-2">
        <span className="text-sm font-semibold text-ink-500">Every</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Fewer"
            onClick={() => onInterval(clamp(n - 1))}
            disabled={n <= 1}
            className="grid h-8 w-8 place-items-center rounded-full bg-parchment-50 text-ink-700 shadow-sm transition-colors disabled:opacity-40"
          >
            <Minus size={16} />
          </button>
          <span className="min-w-[3.5ch] text-center text-base font-semibold tabular-nums text-ink-900">
            {n === 1 ? unit : `${n} ${unit}s`}
          </span>
          <button
            type="button"
            aria-label="More"
            onClick={() => onInterval(clamp(n + 1))}
            disabled={n >= MAX_INTERVAL}
            className="grid h-8 w-8 place-items-center rounded-full bg-parchment-50 text-ink-700 shadow-sm transition-colors disabled:opacity-40"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <p className="text-[12px] text-ink-500">
        Repeats <span className="font-semibold text-ink-700">{cadenceLabel(cadence, n).toLowerCase()}</span>.
      </p>
    </div>
  );
}

/** Horizontal chip row of accounts. */
export function AccountPicker({
  accounts,
  value,
  onChange,
  label,
}: {
  accounts: Account[];
  value: string | null;
  onChange: (id: string) => void;
  label?: string;
}) {
  return (
    <div>
      {label && <div className="mb-1.5 text-sm font-semibold text-ink-700">{label}</div>}
      <div className="flex flex-wrap gap-2">
        {accounts.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(a.id)}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
              value === a.id
                ? 'border-transparent text-white'
                : 'border-parchment-300 bg-parchment-50 text-ink-700'
            )}
            style={value === a.id ? { backgroundColor: a.color } : undefined}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: value === a.id ? 'rgba(255,255,255,0.9)' : a.color }}
            />
            {a.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Grid of category tiles with tinted icons. */
export function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-x-2 gap-y-3">
      {categories.map((c) => {
        const active = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-card border px-1.5 pb-2 pt-2.5 transition-colors',
              active ? 'border-teal-400 bg-teal-50' : 'border-transparent hover:bg-parchment-200'
            )}
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]"
              style={{ backgroundColor: `${c.color}22`, color: c.color }}
            >
              <Icon name={c.icon} size={18} />
            </span>
            {/* Two lines is the ceiling: longer names ellipsise rather than
                growing the tile, so every row in the grid stays level. */}
            <span
              className="line-clamp-2 h-[30px] w-full break-words text-center text-[11px] font-medium leading-snug text-ink-700"
              title={c.name}
            >
              {c.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
