import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Minus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, SectionHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Money } from '../components/ui/Money';
import { ProgressRing } from '../components/ui/ProgressRing';
import { EmptyState } from '../components/ui/EmptyState';
import { AccountPicker } from '../components/add/Pickers';
import { GoalMeta, formatShort } from '../components/finance/GoalRow';
import { GoalFormModal } from '../components/finance/GoalFormModal';
import {
  useGoal,
  useContributions,
  useAllContributions,
  useAccounts,
  useAccountMap,
  monthlyRate,
} from '../hooks/useData';
import { useSubmit } from '../hooks/useSubmit';
import { addContribution, deleteContribution } from '../lib/repo';
import { goalProjection, groupIndianDigits } from '../lib/calculations';
import type { Account } from '../types';

export function GoalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goal = useGoal(id);
  const contributions = useContributions(id);
  const allContribs = useAllContributions();
  const accounts = useAccounts();
  const accountMap = useAccountMap();
  const [editing, setEditing] = useState(false);
  const [contribMode, setContribMode] = useState<null | 'add' | 'withdraw'>(null);

  // undefined = the live query hasn't resolved yet. Rendering "not found" here
  // would flash it on every cold load of this route before Dexie answers.
  if (goal === undefined) {
    return (
      <div>
        <PageHeader title="Goal" back />
      </div>
    );
  }

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
          {contributions.map((c) => {
            const account = c.account_id ? accountMap.get(c.account_id) : undefined;
            return (
              <div key={c.id} className="group flex items-center gap-3 px-4 py-3">
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
                  <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-900">
                    {c.amount >= 0 ? 'Added' : 'Withdrew'}
                    {account && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-parchment-200 px-1.5 py-0.5 text-[10.5px] font-medium text-ink-500">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: account.color }} />
                        {c.amount >= 0 ? account.name : `to ${account.name}`}
                      </span>
                    )}
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
                <button
                  onClick={() => void deleteContribution(c.id)}
                  aria-label="Delete entry"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-300 hover:bg-parchment-200 hover:text-rose-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </Card>
      )}

      <ContributionModal
        mode={contribMode}
        goalName={goal.name}
        maxWithdraw={goal.saved}
        accounts={accounts}
        onClose={() => setContribMode(null)}
        onSubmit={async (paise, accountId, note) => {
          await addContribution(goal.id, paise, accountId, note);
          setContribMode(null);
        }}
      />
      <GoalFormModal
        open={editing}
        onClose={() => setEditing(false)}
        onDeleted={() => navigate('/goals', { replace: true })}
        goal={goal}
      />
    </div>
  );
}

function ContributionModal({
  mode,
  goalName,
  maxWithdraw,
  accounts,
  onClose,
  onSubmit,
}: {
  mode: null | 'add' | 'withdraw';
  goalName: string;
  maxWithdraw: number;
  accounts: Account[];
  onClose: () => void;
  onSubmit: (paise: number, accountId: string | null, note: string) => Promise<void>;
}) {
  const [rupees, setRupees] = useState('');
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const { pending, submit } = useSubmit();

  // Default to the first account whenever the sheet opens.
  useEffect(() => {
    if (mode) setAccountId((prev) => prev ?? accounts[0]?.id ?? null);
  }, [mode, accounts]);

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
          placeholder="5,000"
          value={groupIndianDigits(rupees)}
          onChange={(e) => setRupees(e.target.value.replace(/[^0-9]/g, ''))}
          error={over ? `You only have ${formatShort(maxWithdraw)} saved.` : undefined}
        />
        {accounts.length > 0 && (
          <AccountPicker
            accounts={accounts}
            value={accountId}
            onChange={setAccountId}
            label={isWithdraw ? 'Return to account' : 'Save from account'}
          />
        )}
        <Input label="Note" placeholder="Optional" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button
          block
          disabled={!canSave || pending}
          onClick={() =>
            submit(async () => {
              await onSubmit(isWithdraw ? -paise : paise, accountId, note.trim());
              setRupees('');
              setNote('');
            })
          }
        >
          {isWithdraw ? 'Withdraw' : 'Add money'}
        </Button>
      </div>
    </Modal>
  );
}
