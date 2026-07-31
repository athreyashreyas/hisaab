import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Minus, Pencil, Landmark, TrendingUp, CircleSlash } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, SectionHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Money } from '../components/ui/Money';
import { AmountField } from '../components/ui/AmountField';
import { DateInput } from '../components/ui/DateInput';
import { ProgressRing } from '../components/ui/ProgressRing';
import { EmptyState } from '../components/ui/EmptyState';
import { GoalMeta } from '../components/finance/GoalRow';
import { formatShort } from '../lib/money';
import { GoalPaceCard } from '../components/finance/GoalPaceCard';
import { GoalFormModal } from '../components/finance/GoalFormModal';
import {
  SourcePicker,
  sourceColumns,
  sourceOf,
  type FundingSource,
} from '../components/finance/SourcePicker';
import {
  useGoal,
  useContributions,
  useAccounts,
  useAccountMap,
  useInvestments,
} from '../hooks/useData';
import { useSubmit } from '../hooks/useSubmit';
import { addContribution, updateContribution, deleteContribution } from '../lib/repo';
import { midnight } from '../lib/dates';
import { fundingBreakdown, goalPace } from '../lib/goals';
import type { Account, GoalContribution, ID, Investment } from '../types';
import { cn } from '../lib/cn';

type ContribMode =
  | { kind: 'add' }
  | { kind: 'withdraw' }
  | { kind: 'edit'; contribution: GoalContribution }
  | null;

export function GoalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goal = useGoal(id);
  const contributions = useContributions(id);
  const accounts = useAccounts();
  const accountMap = useAccountMap();
  const investments = useInvestments();
  const [editing, setEditing] = useState(false);
  const [contribMode, setContribMode] = useState<ContribMode>(null);

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

  const pace = goalPace(goal, contributions);
  const investmentMap = new Map<ID, Investment>(investments.map((i) => [i.id, i]));
  const sources = fundingBreakdown(contributions, accountMap, investmentMap);
  const defaultSource = sourceOf(
    goal.funding_account_id ?? null,
    goal.funding_investment_id ?? null
  );

  return (
    <div>
      <PageHeader
        kicker="Goal"
        title={goal.name}
        back
        trailing={
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)} className="px-3">
            <Pencil size={14} /> Edit
          </Button>
        }
      />

      <Card className="mt-3 flex items-center gap-5 p-5">
        <ProgressRing
          progress={pace.progress}
          size={92}
          stroke={9}
          color={goal.color}
          label={`${Math.round(pace.progress * 100)}%`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <Money paise={goal.saved} className="text-2xl text-ink-900" />
            <span className="text-sm text-ink-300">of {formatShort(goal.target)}</span>
          </div>
          <div className="mt-1 text-[13px] tabular-nums">
            <GoalMeta goal={goal} pace={pace} />
          </div>
          {pace.remaining > 0 && (
            <div className="mt-1 text-[12px] tabular-nums text-ink-500">
              {formatShort(pace.remaining)} to go
              {goal.target_date && ` · by ${format(goal.target_date, 'd MMM yyyy')}`}
            </div>
          )}
        </div>
      </Card>

      <GoalPaceCard
        goal={goal}
        pace={pace}
        onSetPlan={() => setEditing(true)}
        className="mt-3"
      />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => setContribMode({ kind: 'add' })}>
          <Plus size={18} /> Add money
        </Button>
        <Button
          variant="ghost"
          onClick={() => setContribMode({ kind: 'withdraw' })}
          className="border border-parchment-300"
          disabled={goal.saved === 0}
        >
          <Minus size={18} /> Withdraw
        </Button>
      </div>

      {sources.length > 0 && (
        <>
          <SectionHeader title="Funded from" subtle />
          <Card className="divide-y divide-parchment-200 overflow-hidden">
            {sources.map((s) => (
              <div key={`${s.kind}:${s.id}`} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
                  style={{ backgroundColor: `${s.color}22`, color: s.color }}
                >
                  {s.kind === 'account' ? (
                    <Landmark size={15} />
                  ) : s.kind === 'investment' ? (
                    <TrendingUp size={15} />
                  ) : (
                    <CircleSlash size={15} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-ink-900">{s.name}</div>
                  <div className="text-[11.5px] text-ink-500">
                    {s.kind === 'account'
                      ? 'Held out of this account'
                      : s.kind === 'investment'
                        ? 'Held inside this investment'
                        : 'Source not recorded'}
                  </div>
                </div>
                <Money paise={s.amount} className="font-semibold text-ink-900" />
              </div>
            ))}
          </Card>
        </>
      )}

      <SectionHeader title="History" />
      {contributions.length === 0 ? (
        <Card>
          <EmptyState
            icon="coins"
            title="No contributions yet"
            body="Add money to start filling this goal."
          />
        </Card>
      ) : (
        <Card className="divide-y divide-parchment-200 overflow-hidden">
          {contributions.map((c) => {
            const source =
              (c.account_id ? accountMap.get(c.account_id) : undefined) ??
              (c.investment_id ? investmentMap.get(c.investment_id) : undefined);
            const positive = c.amount >= 0;
            return (
              <button
                key={c.id}
                onClick={() => setContribMode({ kind: 'edit', contribution: c })}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-parchment-100"
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
                  style={{
                    backgroundColor: positive ? '#E8F0E6' : '#F3E2E6',
                    color: positive ? '#4F7942' : '#A14A5E',
                  }}
                >
                  {positive ? <Plus size={15} /> : <Minus size={15} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-900">
                    {positive ? 'Added' : 'Withdrew'}
                    {source && (
                      <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-parchment-200 px-1.5 py-0.5 text-[10.5px] font-medium text-ink-500">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: source.color }}
                        />
                        <span className="truncate">
                          {positive ? source.name : `to ${source.name}`}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] text-ink-500">
                    {format(c.date, 'd MMM yyyy')}
                    {c.note && ` · ${c.note}`}
                  </div>
                </div>
                <Money
                  paise={Math.abs(c.amount)}
                  sign={positive ? '+' : '-'}
                  className={cn('font-semibold', positive ? 'text-moss-600' : 'text-rose-600')}
                />
              </button>
            );
          })}
        </Card>
      )}
      {contributions.length > 0 && (
        <p className="mt-2 px-1 text-[12px] text-ink-500">Tap an entry to change or remove it.</p>
      )}

      <ContributionModal
        mode={contribMode}
        goalName={goal.name}
        maxWithdraw={goal.saved}
        accounts={accounts}
        investments={investments}
        defaultSource={defaultSource}
        onClose={() => setContribMode(null)}
        onDone={async () => setContribMode(null)}
        goalId={goal.id}
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

/**
 * Add, withdraw, or correct one contribution.
 *
 * Editing matters more than it looks: a contribution is the only record here that
 * moves a goal's total *and* an account balance, so a typo'd amount used to mean
 * deleting the row and retyping it, and a date could never be fixed at all — every
 * entry was stamped today, which quietly broke pacing for anyone logging money
 * they'd set aside last week.
 */
function ContributionModal({
  mode,
  goalId,
  goalName,
  maxWithdraw,
  accounts,
  investments,
  defaultSource,
  onClose,
  onDone,
}: {
  mode: ContribMode;
  goalId: ID;
  goalName: string;
  maxWithdraw: number;
  accounts: Account[];
  investments: Investment[];
  defaultSource: FundingSource;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => midnight());
  const [source, setSource] = useState<FundingSource>(null);
  const { pending, submit } = useSubmit();

  const editingContribution = mode?.kind === 'edit' ? mode.contribution : null;
  const isWithdraw =
    mode?.kind === 'withdraw' || (editingContribution != null && editingContribution.amount < 0);

  useEffect(() => {
    if (!mode) return;
    if (editingContribution) {
      setAmount(Math.abs(editingContribution.amount));
      setNote(editingContribution.note);
      setDate(editingContribution.date);
      setSource(
        sourceOf(editingContribution.account_id, editingContribution.investment_id ?? null)
      );
    } else {
      setAmount(0);
      setNote('');
      setDate(midnight());
      setSource(defaultSource);
    }
    // Same reasoning as the goal form: only opening the sheet resets it, never a
    // live query re-emitting the accounts list mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // On an edit, the entry's own current value is already counted in `maxWithdraw`
  // via the goal's saved total, so raising it that far is legitimate.
  const withdrawCeiling =
    maxWithdraw + (editingContribution && editingContribution.amount < 0 ? -editingContribution.amount : 0);
  const over = isWithdraw && amount > withdrawCeiling;
  const canSave = amount > 0 && !over;

  const title = editingContribution
    ? isWithdraw
      ? 'Edit withdrawal'
      : 'Edit contribution'
    : isWithdraw
      ? `Withdraw from ${goalName}`
      : `Add to ${goalName}`;

  async function save() {
    const signed = isWithdraw ? -amount : amount;
    if (editingContribution) {
      await updateContribution(editingContribution.id, {
        amount: signed,
        note: note.trim(),
        date,
        ...sourceColumns(source),
      });
    } else {
      await addContribution({
        goal_id: goalId,
        amount: signed,
        note: note.trim(),
        date,
        ...sourceColumns(source),
      });
    }
    await onDone();
  }

  return (
    <Modal open={mode !== null} onClose={onClose} title={title}>
      <div className="space-y-4 px-5 py-4">
        <AmountField
          label="Amount"
          title={isWithdraw ? 'How much to take out?' : 'How much to put in?'}
          value={amount}
          onChange={setAmount}
          error={over ? `Only ${formatShort(withdrawCeiling)} is saved in this goal.` : undefined}
        />

        <SourcePicker
          accounts={accounts}
          investments={investments}
          value={source}
          onChange={setSource}
          label={isWithdraw ? 'Return it to' : 'Take it from'}
          allowNone
        />

        <DateInput label="Date" value={date} onChange={setDate} />

        <Input
          label="Note"
          placeholder="Optional"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex gap-2 pt-1">
          {editingContribution && (
            <Button
              variant="ghost"
              onClick={() =>
                submit(async () => {
                  await deleteContribution(editingContribution.id);
                  await onDone();
                })
              }
              disabled={pending}
              className="px-3 text-rose-600"
            >
              Delete
            </Button>
          )}
          <Button
            onClick={() => submit(save)}
            disabled={!canSave || pending}
            className="flex-1"
          >
            {editingContribution ? 'Save changes' : isWithdraw ? 'Withdraw' : 'Add money'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
