import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, SectionHeader } from '../components/ui/Card';
import { SafeToSpendCard } from '../components/finance/SafeToSpendCard';
import { GoalRow } from '../components/finance/GoalRow';
import { TxnRow } from '../components/finance/TxnRow';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import {
  useMonthTransactions,
  useTransactions,
  useGoals,
  useRecurringRules,
  useCategoryMap,
  useAccountMap,
  useAllContributions,
  useInvestments,
  useMonthlyGoalSetAside,
  portfolioSummary,
  monthlyRate,
} from '../hooks/useData';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Money } from '../components/ui/Money';
import { useUIStore } from '../stores/uiStore';
import {
  safeToSpend,
  categoryBreakdown,
  monthBounds,
  formatINR,
  formatCompactINR,
} from '../lib/calculations';
import type { CategorySlice } from '../lib/calculations';
import type { Category, ID } from '../types';
import { cn } from '../lib/cn';

export function HomePage() {
  const navigate = useNavigate();
  const openAdd = useUIStore((s) => s.openAdd);

  const now = new Date();
  const monthTxns = useMonthTransactions(now);
  const allTxns = useTransactions();
  const goals = useGoals();
  const recurring = useRecurringRules();
  const categoryMap = useCategoryMap();
  const accountMap = useAccountMap();
  const contributions = useAllContributions();
  const investments = useInvestments();
  const portfolio = portfolioSummary(investments);

  const { start, end } = monthBounds(now);
  const goalSetAside = useMonthlyGoalSetAside(now);

  const sts = safeToSpend(monthTxns, recurring, goalSetAside, now);

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthElapsed = now.getDate() / daysInMonth;
  const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);

  const slices = categoryBreakdown(monthTxns, start, end);
  const spentTotal = slices.reduce((s, x) => s + x.total, 0);

  const rates = monthlyRate(contributions);
  const topGoals = goals.slice(0, 3);
  const recent = allTxns.slice(0, 5);

  const hasAnything = allTxns.length > 0;

  return (
    <div>
      <PageHeader
        kicker={format(now, 'EEEE, d MMMM')}
        title="Hisaab"
        subtitle={`${format(now, 'MMMM')} at a glance`}
      />

      <div className="mt-3">
        <SafeToSpendCard
          data={sts}
          monthElapsed={monthElapsed}
          daysLeft={daysLeft}
          dayOfMonth={now.getDate()}
          daysInMonth={daysInMonth}
        />
      </div>

      {spentTotal > 0 && (
        <WhereItWentStrip
          slices={slices}
          categoryMap={categoryMap}
          total={spentTotal}
          onInsights={() => navigate('/insights')}
        />
      )}

      {!hasAnything && (
        <Card className="mt-4">
          <EmptyState
            icon="notebook-pen"
            title="Start your reckoning"
            body="Add your first expense or income and Hisaab does the rest: safe-to-spend, goals, and where it all went."
            action={<Button onClick={openAdd}>Add your first entry</Button>}
          />
        </Card>
      )}

      {topGoals.length > 0 && (
        <>
          <SectionHeader
            title="Goals"
            subtle
            action={
              <button onClick={() => navigate('/goals')} className="text-xs font-semibold text-teal-600">
                All goals →
              </button>
            }
          />
          <Card className="divide-y divide-parchment-200 overflow-hidden">
            {topGoals.map((g) => (
              <GoalRow
                key={g.id}
                goal={g}
                ratePerMonth={rates.get(g.id) ?? 0}
                onClick={() => navigate(`/goals/${g.id}`)}
              />
            ))}
          </Card>
        </>
      )}

      {investments.length > 0 && (
        <>
          <SectionHeader
            title="Investments"
            subtle
            action={
              <button onClick={() => navigate('/invest')} className="text-xs font-semibold text-teal-600">
                Portfolio →
              </button>
            }
          />
          <Card
            as="button"
            onClick={() => navigate('/invest')}
            className="flex w-full items-center gap-4 p-4 text-left hover:bg-parchment-100"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-300">
                Current value
              </div>
              <Money paise={portfolio.current} className="mt-0.5 block text-[22px] text-ink-900" />
            </div>
            <div
              className={cn(
                'flex shrink-0 items-center gap-1 text-[14px] font-semibold tabular-nums',
                portfolio.gain >= 0 ? 'text-moss-600' : 'text-rose-600'
              )}
            >
              {portfolio.gain >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              <Money paise={Math.abs(portfolio.gain)} sign={portfolio.gain >= 0 ? '+' : '-'} />
              <span className="opacity-80">
                ({portfolio.returnPct >= 0 ? '+' : ''}
                {(portfolio.returnPct * 100).toFixed(1)}%)
              </span>
            </div>
          </Card>
        </>
      )}

      {recent.length > 0 && (
        <>
          <SectionHeader
            title="Recent"
            subtle
            action={
              <button onClick={() => navigate('/ledger')} className="text-xs font-semibold text-teal-600">
                All →
              </button>
            }
          />
          <Card className="divide-y divide-parchment-200 overflow-hidden">
            {recent.map((t) => (
              <TxnRow
                key={t.id}
                txn={t}
                category={t.category_id ? categoryMap.get(t.category_id) : undefined}
                account={accountMap.get(t.account_id)}
                toAccount={t.to_account_id ? accountMap.get(t.to_account_id) : undefined}
                onClick={() => useUIStore.getState().openEdit(t)}
              />
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

/**
 * "Where it went", fused into the hero group as a borderless money-story strip
 * rather than a fifth equal card: a compact category donut on the left (total in
 * the hole) and the top two categories with a "+N more" line on the right, so the
 * safe-to-spend hero clearly leads the screen. The donut is a CSS conic-gradient
 * (no recharts), keeping Home's shell light.
 */
function WhereItWentStrip({
  slices,
  categoryMap,
  total,
  onInsights,
}: {
  slices: CategorySlice[];
  categoryMap: Map<ID, Category>;
  total: number;
  onInsights: () => void;
}) {
  const items = slices.map((s) => {
    const cat = s.categoryId ? categoryMap.get(s.categoryId) : undefined;
    return {
      name: cat?.name ?? 'Uncategorised',
      color: cat?.color ?? '#6B6960',
      total: s.total,
      share: s.share,
    };
  });

  let acc = 0;
  const stops = items
    .map((it) => {
      const from = acc * 100;
      acc += it.share;
      return `${it.color} ${from}% ${acc * 100}%`;
    })
    .join(', ');

  const top = items.slice(0, 2);
  const moreCount = Math.max(0, items.length - 2);

  return (
    <div className="mt-4 flex items-center gap-4 px-0.5">
      <div
        className="relative h-[74px] w-[74px] shrink-0 rounded-full"
        style={{ background: items.length ? `conic-gradient(${stops})` : 'var(--parchment-300)' }}
      >
        <div className="absolute inset-[13px] rounded-full bg-parchment-100" />
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="text-[8.5px] uppercase tracking-[0.06em] text-ink-500">Spent</span>
          <span className="font-serif text-[13px] tabular-nums text-ink-900">{formatCompactINR(total)}</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
            Where it went
          </span>
          <button onClick={onInsights} className="text-xs font-semibold text-teal-600">
            Insights →
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {top.map((it) => (
            <div key={it.name} className="flex items-center gap-2 text-[12.5px] text-ink-700">
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: it.color }} />
              <span className="truncate">{it.name}</span>
              <span className="ml-auto shrink-0 font-semibold tabular-nums text-ink-900">
                {formatINR(it.total)}
              </span>
            </div>
          ))}
          {moreCount > 0 && (
            <div className="flex items-center gap-2 text-[12.5px] text-ink-500">
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px] bg-parchment-300" />
              <span className="truncate">Other categories</span>
              <span className="ml-auto shrink-0 tabular-nums">+{moreCount} more</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
