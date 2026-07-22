import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Money } from '../components/ui/Money';
import { GoalMeta } from '../components/finance/GoalRow';
import { GoalFormModal } from '../components/finance/GoalFormModal';
import { useGoals, useAllContributions, monthlyRate } from '../hooks/useData';
import { goalProjection } from '../lib/calculations';

/** Grid of goal cards with progress ring + projection line. */
export function GoalsPage() {
  const navigate = useNavigate();
  const goals = useGoals();
  const contributions = useAllContributions();
  const rates = monthlyRate(contributions);
  const [adding, setAdding] = useState(false);

  // Portfolio-level answer: total saved across all goals and the monthly
  // set-aside run-rate, shown above the per-goal grid.
  const totalSaved = goals.reduce((s, g) => s + g.saved, 0);
  const monthlySetAside = goals.reduce((s, g) => s + (rates.get(g.id) ?? 0), 0);

  return (
    <div>
      <PageHeader
        kicker="Worth saving for"
        title="Goals"
        trailing={
          <Button size="sm" onClick={() => setAdding(true)} className="px-3">
            <Plus size={16} /> New
          </Button>
        }
      />

      {goals.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon="target"
            title="Set something worth saving for"
            body="A trip, a gift, a rainy-day fund. Hisaab tracks each one and guesses when you'll get there."
            action={<Button onClick={() => setAdding(true)}>Create a goal</Button>}
          />
        </Card>
      ) : (
        <>
          <Card className="mt-4 flex items-center justify-between p-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-500">
                Saved across {goals.length} goal{goals.length === 1 ? '' : 's'}
              </div>
              <Money paise={totalSaved} className="mt-0.5 block text-[22px] text-ink-900" />
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-500">
                Set aside / mo
              </div>
              <Money paise={monthlySetAside} className="mt-0.5 block text-[22px] text-teal-600" />
            </div>
          </Card>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {goals.map((g) => {
            const rate = rates.get(g.id) ?? 0;
            const proj = goalProjection(g, rate);
            return (
              <Card
                key={g.id}
                as="button"
                onClick={() => navigate(`/goals/${g.id}`)}
                className="flex items-center gap-4 p-4 text-left hover:bg-parchment-100"
              >
                <ProgressRing
                  progress={proj.progress}
                  size={58}
                  stroke={6}
                  color={g.color}
                  label={`${Math.round(proj.progress * 100)}%`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink-900">{g.name}</div>
                  <div className="mt-0.5 truncate text-[12px] tabular-nums">
                    <GoalMeta goal={g} proj={proj} />
                  </div>
                  <div className="mt-1.5 text-[13px] tabular-nums text-ink-700">
                    <Money paise={g.saved} className="font-semibold" />
                    <span className="text-[11.5px] text-ink-500"> of </span>
                    <Money paise={g.target} className="text-[11.5px] text-ink-500" />
                  </div>
                </div>
              </Card>
            );
          })}
          </div>
        </>
      )}

      <GoalFormModal open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
