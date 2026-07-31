import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Money } from '../components/ui/Money';
import { GoalMeta, PaceChip } from '../components/finance/GoalRow';
import { formatShort } from '../lib/money';
import { GoalFormModal } from '../components/finance/GoalFormModal';
import { useGoals, useAllContributions } from '../hooks/useData';
import type { EditorTarget } from '../hooks/useEditorTarget';
import { goalPace, groupContributions } from '../lib/goals';
import type { Goal } from '../types';

/** Grid of goal cards: progress, pace verdict, and what each one wants this month. */
export function GoalsPage() {
  const navigate = useNavigate();
  const goals = useGoals();
  const contributions = useAllContributions();
  const byGoal = groupContributions(contributions);
  const [editing, setEditing] = useState<EditorTarget<Goal>>(null);

  const now = new Date();
  const paced = goals.map((goal) => ({ goal, pace: goalPace(goal, byGoal.get(goal.id) ?? []) }));

  // The portfolio answer, and the one that actually drives behaviour: what all
  // your goals together are asking for before this month is out.
  const totalSaved = goals.reduce((s, g) => s + g.saved, 0);
  const dueThisMonth = paced.reduce((s, p) => s + p.pace.dueThisMonth, 0);
  const dueNextMonth = paced.reduce((s, p) => s + p.pace.dueNextMonth, 0);
  const addedThisMonth = paced.reduce((s, p) => s + p.pace.addedThisMonth, 0);
  const behind = paced.filter((p) => p.pace.state === 'behind' || p.pace.state === 'overdue').length;

  return (
    <div>
      <PageHeader
        kicker="Worth saving for"
        title="Goals"
        trailing={
          <Button size="sm" onClick={() => setEditing('new')} className="px-3">
            <Plus size={16} /> New
          </Button>
        }
      />

      {goals.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon="target"
            title="Set something worth saving for"
            body="A trip, a gift, a rainy-day fund. Tell Hisaab what it costs, where the money comes from, and how often you'll put some in, and it keeps you honest about the rest."
            action={<Button onClick={() => setEditing('new')}>Create a goal</Button>}
          />
        </Card>
      ) : (
        <>
          <Card className="mt-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-500">
                  {dueThisMonth > 0 ? `To add in ${format(now, 'MMMM')}` : format(now, 'MMMM')}
                </div>
                {dueThisMonth > 0 ? (
                  <Money paise={dueThisMonth} className="mt-0.5 block text-[28px] text-ink-900" />
                ) : (
                  <div className="mt-0.5 font-serif text-[24px] text-moss-600">All caught up</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-500">
                  Saved so far
                </div>
                <Money paise={totalSaved} className="mt-0.5 block text-[20px] text-ink-900" />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-parchment-200 pt-3 text-[12px] tabular-nums text-ink-500">
              <span>
                <Money paise={addedThisMonth} className="font-semibold text-ink-700" /> in this month
              </span>
              {dueNextMonth > 0 && (
                <span>
                  {format(addMonths(now, 1), 'MMMM')} wants{' '}
                  <span className="font-semibold text-ink-700">{formatShort(dueNextMonth)}</span>
                </span>
              )}
              {behind > 0 && (
                <span className="font-semibold text-amber-600">
                  {behind} goal{behind === 1 ? '' : 's'} behind
                </span>
              )}
            </div>
          </Card>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {paced.map(({ goal, pace }) => (
              <Card key={goal.id} className="overflow-hidden">
                <button
                  onClick={() => navigate(`/goals/${goal.id}`)}
                  className="flex w-full items-center gap-4 p-4 text-left hover:bg-parchment-100"
                >
                  <ProgressRing
                    progress={pace.progress}
                    size={58}
                    stroke={6}
                    color={goal.color}
                    label={`${Math.round(pace.progress * 100)}%`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-semibold text-ink-900">
                        {goal.name}
                      </span>
                      <PaceChip pace={pace} />
                    </div>
                    <div className="mt-0.5 truncate text-[12px] tabular-nums">
                      <GoalMeta goal={goal} pace={pace} />
                    </div>
                    <div className="mt-1.5 text-[13px] tabular-nums text-ink-700">
                      <Money paise={goal.saved} className="font-semibold" />
                      <span className="text-[11.5px] text-ink-500"> of </span>
                      <Money paise={goal.target} className="text-[11.5px] text-ink-500" />
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-2 border-t border-parchment-200 px-4 py-2">
                  <span className="min-w-0 flex-1 truncate text-[12px] tabular-nums text-ink-500">
                    {pace.state === 'reached' ? (
                      'Nothing more to put in'
                    ) : pace.dueThisMonth > 0 ? (
                      <>
                        <span className="font-semibold text-ink-900">
                          {formatShort(pace.dueThisMonth)}
                        </span>{' '}
                        due this month
                      </>
                    ) : pace.state === 'unplanned' ? (
                      'No schedule set'
                    ) : (
                      'Nothing due this month'
                    )}
                  </span>
                  <button
                    onClick={() => setEditing(goal)}
                    aria-label={`Edit ${goal.name}`}
                    className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11.5px] font-semibold text-teal-600 hover:bg-parchment-200"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <GoalFormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        goal={editing === 'new' ? null : editing}
      />
    </div>
  );
}
