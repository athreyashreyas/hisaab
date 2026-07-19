import { useMemo, useState } from 'react';
import { format, startOfWeek, addDays, subMonths } from 'date-fns';
import { ArrowUp, ArrowDown, Check, X, Plus, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, SectionHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { Money } from '../components/ui/Money';
import { Badge } from '../components/ui/Badge';
import { TrendChart, type TrendPoint } from '../components/finance/TrendChart';
import { PaceBar } from '../components/finance/PaceBar';
import { Segmented } from '../components/add/Pickers';
import {
  useTransactions,
  useCategories,
  useCategoryMap,
  useAccountMap,
  useRecurringRules,
} from '../hooks/useData';
import {
  categoryBreakdown,
  categoryPace,
  detectRecurring,
  monthBounds,
  monthlyEquivalent,
  cadenceLabel,
  formatINR,
  formatCompactINR,
} from '../lib/calculations';
import { createRecurringRule } from '../lib/repo';
import { RecurringSheet } from '../components/finance/RecurringSheet';
import type { Cadence, RecurringRule, Transaction } from '../types';

type Granularity = 'day' | 'week' | 'month';

export function InsightsPage() {
  const txns = useTransactions();
  const categories = useCategories();
  const categoryMap = useCategoryMap();
  const accountMap = useAccountMap();
  const rules = useRecurringRules();
  const [gran, setGran] = useState<Granularity>('day');
  const [recurringSheet, setRecurringSheet] = useState<{ open: boolean; editing: RecurringRule | null }>({
    open: false,
    editing: null,
  });

  const now = new Date();
  const { start, end } = monthBounds(now);
  const prev = monthBounds(subMonths(now, 1));

  const thisMonth = useMemo(
    () => txns.filter((t) => t.date >= start && t.date < end),
    [txns, start, end]
  );
  const lastMonth = useMemo(
    () => txns.filter((t) => t.date >= prev.start && t.date < prev.end),
    [txns, prev.start, prev.end]
  );

  const trend = useMemo(() => buildTrend(txns, gran, now), [txns, gran]);

  const slices = categoryBreakdown(txns, start, end);
  const spentTotal = slices.reduce((s, x) => s + x.total, 0);

  // Month-over-month per category.
  const lastByCat = new Map<string | null, number>();
  for (const t of lastMonth) {
    if (t.type !== 'expense') continue;
    lastByCat.set(t.category_id, (lastByCat.get(t.category_id) ?? 0) + t.amount);
  }

  // Budget pacing for categories that have a budget set.
  const spentByCat = new Map<string, number>();
  for (const t of thisMonth) {
    if (t.type !== 'expense' || !t.category_id) continue;
    spentByCat.set(t.category_id, (spentByCat.get(t.category_id) ?? 0) + t.amount);
  }
  const budgeted = categories.filter((c) => c.monthly_budget && c.monthly_budget > 0);

  // Recurring: confirmed rules + fresh detections not yet a rule.
  const detected = useMemo(() => detectRecurring(txns), [txns]);
  const confirmed = rules.filter((r) => r.confirmed && r.active);
  const knownMerchants = new Set(rules.map((r) => r.merchant.trim().toLowerCase()));
  const suggestions = detected.filter((d) => !knownMerchants.has(d.merchant.trim().toLowerCase()));
  const monthlyCommitted = confirmed.reduce(
    (s, r) => s + monthlyEquivalent(r.amount, r.cadence, r.interval),
    0
  );

  if (txns.length === 0) {
    return (
      <div>
        <PageHeader kicker="Patterns & pacing" title="Insights" />
        <Card className="mt-4">
          <EmptyState
            icon="pie-chart"
            title="Insights arrive with your entries"
            body="Log a few expenses and this fills with trends, breakdowns, and budget pacing."
          />
        </Card>
        <SectionHeader title="Recurring" action={<AddRecurringButton onClick={() => setRecurringSheet({ open: true, editing: null })} />} />
        <Card>
          <EmptyState
            icon="repeat"
            title="Add a recurring payment"
            body="Rent, subscriptions, SIPs: add them here and they'll count toward “Bills to come”."
          />
        </Card>
        <RecurringSheet
          open={recurringSheet.open}
          editing={recurringSheet.editing}
          onClose={() => setRecurringSheet({ open: false, editing: null })}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader kicker="Patterns & pacing" title="Insights" />

      <div className="mt-3">
        <Segmented
          options={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
          value={gran}
          onChange={(v) => setGran(v as Granularity)}
        />
      </div>

      <Card className="mt-3">
        <div className="flex items-baseline justify-between px-4 pt-3">
          <span className="text-[13px] font-semibold text-ink-700">Spending over time</span>
          <span className="text-[12px] tabular-nums text-ink-500">
            {formatCompactINR(trend.reduce((s, p) => s + p.spent, 0))} total
          </span>
        </div>
        <TrendChart data={trend} />
      </Card>

      {spentTotal > 0 && (
        <>
          <SectionHeader title="By category" />
          <Card className="divide-y divide-parchment-200 overflow-hidden">
            {slices.map((s) => {
              const cat = s.categoryId ? categoryMap.get(s.categoryId) : undefined;
              const lastVal = lastByCat.get(s.categoryId) ?? 0;
              const delta = lastVal > 0 ? (s.total - lastVal) / lastVal : null;
              return (
                <div key={s.categoryId ?? 'none'} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className="grid h-8 w-8 place-items-center rounded-[9px]"
                    style={{ backgroundColor: `${cat?.color ?? '#6B6960'}22`, color: cat?.color ?? '#6B6960' }}
                  >
                    <Icon name={cat?.icon ?? 'circle-dashed'} size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-semibold text-ink-900">
                        {cat?.name ?? 'Uncategorised'}
                      </span>
                      {delta !== null && Math.abs(delta) >= 0.01 && <DeltaChip delta={delta} />}
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-parchment-200">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.round(s.share * 100)}%`, backgroundColor: cat?.color ?? '#6B6960' }}
                      />
                    </div>
                  </div>
                  <Money paise={s.total} className="text-[13.5px] font-semibold text-ink-900" />
                </div>
              );
            })}
          </Card>
        </>
      )}

      {budgeted.length > 0 && (
        <>
          <SectionHeader title="Budget pacing" />
          <Card className="divide-y divide-parchment-200 overflow-hidden">
            {budgeted.map((c) => (
              <PaceBar
                key={c.id}
                category={c}
                pace={categoryPace(c.id, c.monthly_budget!, spentByCat.get(c.id) ?? 0, now)}
              />
            ))}
          </Card>
        </>
      )}

      <SectionHeader
        title="Recurring"
        action={
          <div className="flex items-center gap-3">
            {confirmed.length > 0 && (
              <span className="text-[12px] tabular-nums text-ink-500">
                {formatINR(monthlyCommitted)}/mo committed
              </span>
            )}
            <AddRecurringButton onClick={() => setRecurringSheet({ open: true, editing: null })} />
          </div>
        }
      />
      {confirmed.length === 0 && suggestions.length === 0 ? (
        <Card>
          <EmptyState
            icon="repeat"
            title="No recurring bills yet"
            body="Add rent, subscriptions or SIPs with the “Add” button, or let Hisaab suggest one once a merchant repeats on a regular cadence."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {suggestions.length > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b border-parchment-200 bg-teal-50 px-4 py-2 text-[12px] font-semibold text-teal-700">
                Detected, confirm to track
              </div>
              <div className="divide-y divide-parchment-200">
                {suggestions.map((d) => (
                  <div key={d.merchant} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold text-ink-900">{d.merchant}</div>
                      <div className="text-[11.5px] capitalize text-ink-500">
                        {d.cadence} · {d.occurrences} times · ~{formatINR(d.amount)}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        createRecurringRule({
                          merchant: d.merchant,
                          amount: d.amount,
                          category_id: d.category_id,
                          account_id: d.account_id,
                          cadence: d.cadence,
                          anchor: new Date().getDate(),
                          next_due: nextDue(d.cadence),
                          confirmed: true,
                        })
                      }
                      aria-label="Confirm"
                      className="grid h-8 w-8 place-items-center rounded-full bg-moss-100 text-moss-600"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() =>
                        createRecurringRule({
                          merchant: d.merchant,
                          amount: d.amount,
                          category_id: d.category_id,
                          account_id: d.account_id,
                          cadence: d.cadence,
                          anchor: new Date().getDate(),
                          next_due: nextDue(d.cadence),
                          confirmed: false,
                          active: false,
                        })
                      }
                      aria-label="Dismiss"
                      className="grid h-8 w-8 place-items-center rounded-full bg-parchment-200 text-ink-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {confirmed.length > 0 && (
            <Card className="divide-y divide-parchment-200 overflow-hidden">
              {confirmed.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRecurringSheet({ open: true, editing: r })}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-parchment-100"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-amber-100 text-amber-600">
                    <Icon name="repeat" size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold text-ink-900">{r.merchant}</div>
                    <div className="text-[11.5px] text-ink-500">
                      {cadenceLabel(r.cadence, r.interval)} · next {format(r.next_due, 'd MMM')} ·{' '}
                      {accountMap.get(r.account_id)?.name ?? '-'}
                    </div>
                  </div>
                  <Money paise={r.amount} className="text-[13.5px] font-semibold text-ink-900" />
                  <ChevronRight size={16} className="shrink-0 text-ink-300" />
                </button>
              ))}
            </Card>
          )}
        </div>
      )}

      <RecurringSheet
        open={recurringSheet.open}
        editing={recurringSheet.editing}
        onClose={() => setRecurringSheet({ open: false, editing: null })}
      />
    </div>
  );
}

function AddRecurringButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-[12px] font-semibold text-teal-700 transition-colors hover:bg-teal-100"
    >
      <Plus size={13} />
      Add
    </button>
  );
}

function DeltaChip({ delta }: { delta: number }) {
  const up = delta > 0;
  return (
    <Badge tone={up ? 'over' : 'ok'} className="shrink-0">
      {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {Math.round(Math.abs(delta) * 100)}%
    </Badge>
  );
}

function nextDue(cadence: Cadence): number {
  const d = new Date();
  if (cadence === 'daily') d.setDate(d.getDate() + 1);
  else if (cadence === 'weekly') d.setDate(d.getDate() + 7);
  else if (cadence === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Build a spend-over-time series at the chosen granularity. */
function buildTrend(txns: Transaction[], gran: Granularity, ref: Date): TrendPoint[] {
  const expenses = txns.filter((t) => t.type === 'expense');
  const bucket = new Map<string, { label: string; spent: number; order: number }>();

  if (gran === 'day') {
    const { start } = monthBounds(ref);
    const days = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(i + 1);
      bucket.set(format(d, 'yyyy-MM-dd'), { label: format(d, 'd'), spent: 0, order: i });
    }
    for (const t of expenses) {
      const key = format(t.date, 'yyyy-MM-dd');
      const b = bucket.get(key);
      if (b) b.spent += t.amount;
    }
  } else if (gran === 'week') {
    for (let i = 7; i >= 0; i--) {
      const ws = startOfWeek(addDays(ref, -i * 7), { weekStartsOn: 1 });
      bucket.set(format(ws, 'yyyy-ww'), { label: format(ws, 'd MMM'), spent: 0, order: 7 - i });
    }
    for (const t of expenses) {
      const ws = startOfWeek(new Date(t.date), { weekStartsOn: 1 });
      const b = bucket.get(format(ws, 'yyyy-ww'));
      if (b) b.spent += t.amount;
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(ref, i);
      bucket.set(format(m, 'yyyy-MM'), { label: format(m, 'MMM'), spent: 0, order: 5 - i });
    }
    for (const t of expenses) {
      const b = bucket.get(format(new Date(t.date), 'yyyy-MM'));
      if (b) b.spent += t.amount;
    }
  }

  return [...bucket.values()].sort((a, b) => a.order - b.order).map((b) => ({ label: b.label, spent: b.spent }));
}
