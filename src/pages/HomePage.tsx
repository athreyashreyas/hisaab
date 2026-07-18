import { lazy, Suspense } from 'react';
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
} from '../lib/calculations';
import { cn } from '../lib/cn';

// The donut pulls in recharts, which is heavy; loading it lazily keeps it out of
// the initial bundle so Home's shell paints fast and the chart streams in after.
const CategoryPie = lazy(() =>
  import('../components/finance/CategoryPie').then((m) => ({ default: m.CategoryPie }))
);

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
  // Net money moved into goals this month (adds minus withdrawals), counting only
  // goals that still exist — so withdrawing it back, or deleting the goal, frees
  // it from safe-to-spend instead of leaving it stuck in the corpus.
  const liveGoalIds = new Set(goals.map((g) => g.id));
  const goalSetAside = Math.max(
    0,
    contributions
      .filter((c) => c.date >= start && c.date < end && liveGoalIds.has(c.goal_id))
      .reduce((s, c) => s + c.amount, 0)
  );

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
        <SafeToSpendCard data={sts} monthElapsed={monthElapsed} daysLeft={daysLeft} />
      </div>

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

      {spentTotal > 0 && (
        <>
          <SectionHeader
            title="Where it went"
            action={
              <button onClick={() => navigate('/insights')} className="text-xs font-semibold text-teal-600">
                Insights →
              </button>
            }
          />
          <Card>
            <Suspense fallback={<div className="h-[168px]" />}>
              <CategoryPie slices={slices} categoryMap={categoryMap} total={spentTotal} />
            </Suspense>
          </Card>
        </>
      )}

      {recent.length > 0 && (
        <>
          <SectionHeader
            title="Recent"
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
