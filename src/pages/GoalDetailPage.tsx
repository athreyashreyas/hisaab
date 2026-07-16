import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Minus, Pencil } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, SectionHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Money } from '../components/ui/Money';
import { ProgressRing } from '../components/ui/ProgressRing';
import { EmptyState } from '../components/ui/EmptyState';
import { GoalMeta, formatShort } from '../components/finance/GoalRow';
import { GoalFormModal } from '../components/finance/GoalFormModal';
import { useGoal, useContributions, useAllContributions, monthlyRate } from '../hooks/useData';
import { addContribution } from '../lib/repo';
import { goalProjection } from '../lib/calculations';

export function GoalDetailPage() {
  const { id } = useParams();
  const goal = useGoal(id);
  const contributions = useContributions(id);
  const allContribs = useAllContributions();
  const [editing, setEditing] = useState(false);
  const [contribMode, setContribMode] = useState<null | 'add' | 'withdraw'>(null);

  if (!goal) {
    return (
      <div>
        <PageHeader title="Goal" back />
        <Card className="mt-4">
          <EmptyState icon="target" title="Goal not found" body="It may have been deleted." />
        </Card>
      </div>
    );
  }

  const rate = monthlyRate(allContribs).get(goal.id) ?? 0;
  const proj = goalProjection(goal, rate);

  return (
    <div>
      <PageHeader
        kicker="Goal"
        title={goal.name}
        back
        trailing={
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="px-2">
            <Pencil size={16} />
          </Button>
        }
      />

      <Card className="mt-3 flex items-center gap-5 p-5">
        <ProgressRing progress={proj.progress} size={92} stroke={9} color={goal.color} label={`${Math.round(proj.progress * 100)}%`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <Money paise={goal.saved} className="text-2xl text-ink-900" />
            <span className="text-sm text-ink-300">of {formatShort(goal.target)}</span>
          </div>
          <div className="mt-1 text-[13px] tabular-nums">
            <GoalMeta goal={goal} proj={proj} />
          </div>
          {proj.remaining > 0 && (
            <div className="mt-1 text-[12px] tabular-nums text-ink-500">
              {formatShort(proj.remaining)} to go
              {goal.target_date && ` · by ${format(goal.target_date, 'd MMM yyyy')}`}
            </div>
          )}
        </div>
      </Card>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => setContribMode('add')}>
          <Plus size={18} /> Add money
        </Button>
        <Button variant="ghost" onClick={() => setContribMode('withdraw')} className="border border-parchment-300">
          <Minus size={18} /> Withdraw
        </Button>
      </div>

      <SectionHeader title="History" />
      {contributions.length === 0 ? (
        <Card>
          <EmptyState icon="coins" title="No contributions yet" body="Add money to start filling this goal." />
        </Card>
      ) : (
        <Card className="divide-y divide-parchment-200 overflow-hidden">
          {contributions.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="grid h-8 w-8 place-items-center rounded-full"
                style={{
                  backgroundColor: c.amount >= 0 ? '#E8F0E6' : '#F3E2E6',
                  color: c.amount >= 0 ? '#4F7942' : '#A14A5E',
                }}
              >
                {c.amount >= 0 ? <Plus size={15} /> : <Minus size={15} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-ink-900">
                  {c.amount >= 0 ? 'Added' : 'Withdrew'}
                </div>
                <div className="text-[11.5px] text-ink-500">
                  {format(c.date, 'd MMM yyyy')}
                  {c.note && ` · ${c.note}`}
                </div>
              </div>
              <Money
                paise={c.amount}
                sign={c.amount >= 0 ? '+' : '-'}
                className={c.amount >= 0 ? 'font-semibold text-moss-600' : 'font-semibold text-rose-600'}
              />
            </div>
          ))}
        </Card>
      )}

      <ContributionModal
        mode={contribMode}
        goalName={goal.name}
        maxWithdraw={goal.saved}
        onClose={() => setContribMode(null)}
        onSubmit={async (paise, note) => {
          await addContribution(goal.id, paise, note);
          setContribMode(null);
        }}
      />
      <GoalFormModal open={editing} onClose={() => setEditing(false)} goal={goal} />
    </div>
  );
}

function ContributionModal({
  mode,
  goalName,
  maxWithdraw,
  onClose,
  onSubmit,
}: {
  mode: null | 'add' | 'withdraw';
  goalName: string;
  maxWithdraw: number;
  onClose: () => void;
  onSubmit: (paise: number, note: string) => void;
}) {
  const [rupees, setRupees] = useState('');
  const [note, setNote] = useState('');
  const paise = Math.round(Number(rupees) * 100);
  const isWithdraw = mode === 'withdraw';
  const over = isWithdraw && paise > maxWithdraw;
  const canSave = paise > 0 && !over;

  return (
    <Modal
      open={mode !== null}
      onClose={onClose}
      title={isWithdraw ? `Withdraw from ${goalName}` : `Add to ${goalName}`}
    >
      <div className="space-y-4 px-5 py-4">
        <Input
          label="Amount"
          inputMode="numeric"
          autoFocus
          placeholder="5000"
          value={rupees}
          onChange={(e) => setRupees(e.target.value.replace(/[^0-9]/g, ''))}
          error={over ? `You only have ${formatShort(maxWithdraw)} saved.` : undefined}
        />
        <Input label="Note" placeholder="Optional" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button
          block
          disabled={!canSave}
          onClick={() => {
            onSubmit(isWithdraw ? -paise : paise, note.trim());
            setRupees('');
            setNote('');
          }}
        >
          {isWithdraw ? 'Withdraw' : 'Add money'}
        </Button>
      </div>
    </Modal>
  );
}
