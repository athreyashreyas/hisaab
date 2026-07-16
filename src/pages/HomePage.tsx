import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, SectionHeader } from '../components/ui/Card';
import { SafeToSpendCard } from '../components/finance/SafeToSpendCard';
import { GoalRow } from '../components/finance/GoalRow';
import { CategoryPie } from '../components/finance/CategoryPie';
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
  monthlyRate,
} from '../hooks/useData';
import { useUIStore } from '../stores/uiStore';
import {
  safeToSpend,
  categoryBreakdown,
  monthBounds,
} from '../lib/calculations';

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

  const { start, end } = monthBounds(now);
  const goalSetAside = contributions
    .filter((c) => c.date >= start && c.date < end && c.amount > 0)
    .reduce((s, c) => s + c.amount, 0);

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
            body="Add your first expense or income and Hisaab does the rest — safe-to-spend, goals, and where it all went."
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
            <CategoryPie slices={slices} categoryMap={categoryMap} total={spentTotal} />
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
