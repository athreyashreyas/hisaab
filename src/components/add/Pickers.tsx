import { Icon } from '../ui/Icon';
import type { Account, Category } from '../../types';
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
    <div className="grid grid-cols-4 gap-2">
      {categories.map((c) => {
        const active = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-card border px-1 py-2.5 transition-colors',
              active ? 'border-teal-400 bg-teal-50' : 'border-transparent hover:bg-parchment-200'
            )}
          >
            <span
              className="grid h-9 w-9 place-items-center rounded-[10px]"
              style={{ backgroundColor: `${c.color}22`, color: c.color }}
            >
              <Icon name={c.icon} size={18} />
            </span>
            <span className="line-clamp-2 w-full break-words text-center text-[11px] font-medium leading-tight text-ink-700">
              {c.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
