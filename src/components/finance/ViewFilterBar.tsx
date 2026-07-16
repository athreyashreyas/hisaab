import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/cn';

export interface LedgerFilter {
  type: 'all' | 'expense' | 'income' | 'transfer';
  accountId: string | null;
  categoryId: string | null;
}

/**
 * Ledger filter + month switcher + search, in the pattern of Attend's
 * ViewFilterBar. Kept compact so the list stays the star.
 */
export function ViewFilterBar({
  month,
  onMonth,
  filter,
  onFilter,
  search,
  onSearch,
}: {
  month: Date;
  onMonth: (d: Date) => void;
  filter: LedgerFilter;
  onFilter: (f: LedgerFilter) => void;
  search: string;
  onSearch: (s: string) => void;
}) {
  const types: LedgerFilter['type'][] = ['all', 'expense', 'income', 'transfer'];
  const isThisMonth =
    month.getFullYear() === new Date().getFullYear() && month.getMonth() === new Date().getMonth();

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          aria-label="Previous month"
          className="grid h-8 w-8 place-items-center rounded-full text-ink-500 hover:bg-parchment-200"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-serif text-lg text-ink-900">{format(month, 'MMMM yyyy')}</span>
        <button
          onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          disabled={isThisMonth}
          aria-label="Next month"
          className="grid h-8 w-8 place-items-center rounded-full text-ink-500 hover:bg-parchment-200 disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search merchant or note"
          className="w-full rounded-card border-parchment-300 bg-parchment-50 py-2 pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-300 focus:border-teal-400 focus:ring-teal-400"
        />
      </div>

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => onFilter({ ...filter, type: t })}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
              filter.type === t ? 'bg-teal-500 text-white' : 'bg-parchment-200 text-ink-500'
            )}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
