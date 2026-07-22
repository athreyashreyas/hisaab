import { useMemo, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Money } from '../components/ui/Money';
import { TxnRow } from '../components/finance/TxnRow';
import { ViewFilterBar, type LedgerFilter } from '../components/finance/ViewFilterBar';
import { useMonthTransactions, useCategoryMap, useAccountMap } from '../hooks/useData';
import { useUIStore } from '../stores/uiStore';
import { cn } from '../lib/cn';
import type { Transaction } from '../types';

/** Reverse-chronological ledger, grouped by day with sticky headers + day totals. */
export function LedgerPage() {
  const [month, setMonth] = useState(() => new Date());
  const [filter, setFilter] = useState<LedgerFilter>({ type: 'all', accountId: null, categoryId: null });
  const [search, setSearch] = useState('');

  const txns = useMonthTransactions(month);
  const categoryMap = useCategoryMap();
  const accountMap = useAccountMap();
  const openAdd = useUIStore((s) => s.openAdd);
  const openEdit = useUIStore((s) => s.openEdit);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return txns.filter((t) => {
      if (filter.type !== 'all' && t.type !== filter.type) return false;
      if (filter.accountId && t.account_id !== filter.accountId) return false;
      if (filter.categoryId && t.category_id !== filter.categoryId) return false;
      if (q && !`${t.merchant} ${t.note}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [txns, filter, search]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  // Month totals for the summary row — from the same month's transactions the
  // list reduces (unaffected by the type/account/search filters).
  const monthTotals = useMemo(() => {
    let spent = 0;
    let received = 0;
    for (const t of txns) {
      if (t.type === 'expense') spent += t.amount;
      else if (t.type === 'income') received += t.amount;
    }
    return { spent, received, net: received - spent };
  }, [txns]);

  return (
    <div>
      <PageHeader kicker="Your ledger" title="Ledger" />

      <div className="mt-3">
        <ViewFilterBar
          month={month}
          onMonth={setMonth}
          filter={filter}
          onFilter={setFilter}
          search={search}
          onSearch={setSearch}
          summary={<MonthSummary {...monthTotals} />}
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon="receipt-text"
            title={search || filter.type !== 'all' ? 'Nothing matches' : 'No entries yet'}
            body={
              search || filter.type !== 'all'
                ? 'Try a different month or clear the filters.'
                : 'Log an expense or income to begin this month’s reckoning.'
            }
            action={!search && filter.type === 'all' ? <Button onClick={openAdd}>Add entry</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="mt-4 space-y-4">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="sticky top-0 z-10 -mx-1 mb-1.5 flex items-baseline justify-between bg-parchment-100/95 px-1 py-1.5 backdrop-blur">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-700">
                  {group.label}
                </span>
                <span className="text-[12px] font-semibold tabular-nums text-ink-500">
                  <DayTotal net={group.net} />
                </span>
              </div>
              <Card className="divide-y divide-parchment-200 overflow-hidden">
                {group.items.map((t) => (
                  <TxnRow
                    key={t.id}
                    txn={t}
                    category={t.category_id ? categoryMap.get(t.category_id) : undefined}
                    account={accountMap.get(t.account_id)}
                    toAccount={t.to_account_id ? accountMap.get(t.to_account_id) : undefined}
                    onClick={() => openEdit(t)}
                  />
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Month spent / received / net, shown under the month switcher. */
function MonthSummary({ spent, received, net }: { spent: number; received: number; net: number }) {
  return (
    <div className="flex gap-2">
      <SummaryCell label="Spent" value={spent} />
      <SummaryCell label="Received" value={received} moss />
      <SummaryCell label="Net" value={net} moss={net >= 0} sign />
    </div>
  );
}

function SummaryCell({
  label,
  value,
  moss = false,
  sign = false,
}: {
  label: string;
  value: number;
  moss?: boolean;
  sign?: boolean;
}) {
  return (
    <div className="flex-1 rounded-[10px] border border-parchment-200 bg-parchment-50 px-2.5 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-500">{label}</div>
      <Money
        paise={Math.abs(value)}
        sign={sign ? (value >= 0 ? '+' : '-') : undefined}
        className={cn('mt-0.5 block text-[15px]', moss ? 'text-moss-600' : 'text-ink-900')}
      />
    </div>
  );
}

function DayTotal({ net }: { net: number }) {
  if (net === 0) return <span>-</span>;
  return (
    <Money
      paise={Math.abs(net)}
      sign={net > 0 ? '+' : '-'}
      className={net > 0 ? 'text-moss-600' : 'text-ink-500'}
    />
  );
}

interface DayGroup {
  key: string;
  label: string;
  items: Transaction[];
  net: number; // income − expense for the day (transfers net to 0)
}

function groupByDay(txns: Transaction[]): DayGroup[] {
  const map = new Map<string, Transaction[]>();
  for (const t of txns) {
    const key = format(t.date, 'yyyy-MM-dd');
    (map.get(key) ?? map.set(key, []).get(key)!).push(t);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, items]) => {
      // Label off the item's own local-midnight epoch, never new Date(key):
      // parsing "yyyy-MM-dd" gives UTC midnight, which in any timezone behind
      // UTC lands on the previous day and shifts every day header back one.
      const d = new Date(items[0].date);
      const label = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEEE, d MMM');
      const net = items.reduce(
        (s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0),
        0
      );
      return { key, label, items, net };
    });
}
