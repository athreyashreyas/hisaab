import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AmountField } from '../ui/AmountField';
import { ColorPicker } from '../ui/ColorPicker';
import { ToggleCard } from '../ui/ToggleCard';
import { DateInput } from '../ui/DateInput';
import { Icon } from '../ui/Icon';
import { CadencePicker } from '../add/Pickers';
import { SourcePicker, sourceColumns, sourceOf, type FundingSource } from './SourcePicker';
import { formatShort } from './GoalRow';
import { useSubmit } from '../../hooks/useSubmit';
import { useAccounts, useInvestments } from '../../hooks/useData';
import { createGoal, updateGoal, deleteGoal, midnight } from '../../lib/repo';
import { cadenceLabel } from '../../lib/calculations';
import { scheduleDate, suggestPlanAmount, paymentsDueThrough } from '../../lib/goals';
import { ACCENT_PALETTE } from '../../lib/categories';
import type { Cadence, Goal } from '../../types';
import { cn } from '../../lib/cn';

const GOAL_ICONS = [
  'target', 'plane', 'gift', 'home', 'car', 'graduation-cap', 'heart', 'piggy-bank',
  'baby', 'laptop', 'sofa', 'party-popper', 'shield', 'users', 'sparkles', 'banknote',
];

/**
 * Create or edit a goal. Four questions, in the order they actually get asked:
 * what is it and how much, by when, where does the money come from, and how much
 * goes in each time. The last two are what turn a goal from a number you stare at
 * into something the app can hold you to.
 */
export function GoalFormModal({
  open,
  onClose,
  onDeleted,
  goal,
}: {
  open: boolean;
  onClose: () => void;
  /** Called after the goal is deleted, so the caller can navigate away from a
   *  now-gone goal (the detail page redirects to the goals list). */
  onDeleted?: () => void;
  goal?: Goal | null;
}) {
  const accounts = useAccounts();
  const investments = useInvestments();

  const [name, setName] = useState('');
  const [target, setTarget] = useState(0);
  const [hasDate, setHasDate] = useState(false);
  const [date, setDate] = useState(() => midnight());
  const [source, setSource] = useState<FundingSource>(null);
  const [planned, setPlanned] = useState(false);
  const [planAmount, setPlanAmount] = useState(0);
  const [planCadence, setPlanCadence] = useState<Cadence>('monthly');
  const [planInterval, setPlanInterval] = useState(1);
  const [planStart, setPlanStart] = useState(() => midnight());
  const [color, setColor] = useState(ACCENT_PALETTE[0]);
  const [icon, setIcon] = useState('target');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { pending, submit } = useSubmit();

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (goal) {
      setName(goal.name);
      setTarget(goal.target);
      setHasDate(goal.target_date != null);
      setDate(goal.target_date ?? midnight());
      setSource(sourceOf(goal.funding_account_id ?? null, goal.funding_investment_id ?? null));
      setPlanned(goal.plan_amount != null && goal.plan_amount > 0);
      setPlanAmount(goal.plan_amount ?? 0);
      setPlanCadence(goal.plan_cadence ?? 'monthly');
      setPlanInterval(goal.plan_interval || 1);
      setPlanStart(goal.plan_start ?? midnight());
      setColor(goal.color);
      setIcon(goal.icon);
    } else {
      setName('');
      setTarget(0);
      setHasDate(false);
      setDate(midnight());
      // A goal with exactly one place its money could come from doesn't need to
      // ask; anything more and the answer is the user's to give.
      setSource(
        accounts.length === 1 && investments.length === 0
          ? { kind: 'account', id: accounts[0].id }
          : null
      );
      setPlanned(false);
      setPlanAmount(0);
      setPlanCadence('monthly');
      setPlanInterval(1);
      setPlanStart(midnight());
      setColor(ACCENT_PALETTE[0]);
      setIcon('target');
    }
    // `accounts`/`investments` are deliberately not dependencies: they'd re-run
    // this and stamp over what the user has typed every time a live query
    // re-emits. Only opening the sheet (or swapping which goal it's for) resets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, goal]);

  const canSave = name.trim().length > 0 && target > 0;
  const saved = goal?.saved ?? 0;
  const remaining = Math.max(0, target - saved);

  /** What the schedule works out to, spelled out under the plan controls. */
  const planOutlook = (() => {
    if (!planned || planAmount <= 0 || remaining <= 0) return null;
    const payments = Math.ceil(remaining / planAmount);
    const finishes = scheduleDate(planStart, planCadence, planInterval, payments - 1);
    const late = hasDate && finishes > date;
    return { payments, finishes, late };
  })();

  const suggestion =
    hasDate && target > 0
      ? suggestPlanAmount({ target, saved, target_date: date }, planCadence, planInterval, planStart)
      : null;

  async function save() {
    if (!canSave) return;
    const payload = {
      name: name.trim(),
      target,
      color,
      icon,
      target_date: hasDate ? date : null,
      ...sourceColumns(source),
      plan_amount: planned && planAmount > 0 ? planAmount : null,
      plan_cadence: planned && planAmount > 0 ? planCadence : null,
      plan_interval: planInterval,
      plan_start: planned && planAmount > 0 ? planStart : null,
    };
    if (goal) await updateGoal(goal.id, payload);
    else await createGoal(payload);
    onClose();
  }

  async function remove() {
    if (goal) await deleteGoal(goal.id);
    onClose();
    onDeleted?.();
  }

  return (
    <Modal open={open} onClose={onClose} title={goal ? 'Edit goal' : 'New goal'}>
      <div className="space-y-4 px-5 py-4">
        <Input
          label="Name"
          placeholder="Kerala trip, new phone…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <AmountField
          label="Target amount"
          title="How much do you need?"
          value={target}
          onChange={setTarget}
          placeholder="Tap to set a target"
        />

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
            <input
              type="checkbox"
              checked={hasDate}
              onChange={(e) => setHasDate(e.target.checked)}
              className="rounded border-parchment-300 text-teal-500 focus:ring-teal-400"
            />
            Set a target date
          </label>
          {hasDate && (
            <div className="mt-2">
              <DateInput value={date} onChange={setDate} />
            </div>
          )}
        </div>

        <SourcePicker
          accounts={accounts}
          investments={investments}
          value={source}
          onChange={setSource}
          label="Money comes from"
          allowNone
          hint="Set aside from this by default. Each contribution can still come from somewhere else."
        />

        <ToggleCard
          icon="repeat"
          title="Save on a schedule"
          description={
            planned
              ? `${formatShort(planAmount)} ${cadenceLabel(planCadence, planInterval).toLowerCase()}`
              : 'Put the same amount in every week or month'
          }
          on={planned}
          onToggle={(next) => {
            setPlanned(next);
            // Opening the plan with a date already set: start from the amount
            // that actually lands the goal on time, rather than zero.
            if (next && planAmount === 0 && suggestion) setPlanAmount(suggestion);
          }}
        >
          <CadencePicker
            cadence={planCadence}
            interval={planInterval}
            onCadence={setPlanCadence}
            onInterval={setPlanInterval}
          />
          <AmountField
            label="Amount each time"
            title="How much each time?"
            value={planAmount}
            onChange={setPlanAmount}
            placeholder="Tap to set an amount"
          />
          {suggestion != null && suggestion !== planAmount && (
            <button
              type="button"
              onClick={() => setPlanAmount(suggestion)}
              className="w-full rounded-card border border-teal-300 bg-teal-50 px-3 py-2 text-left text-[12.5px] text-teal-700"
            >
              <span className="font-semibold">{formatShort(suggestion)}</span>{' '}
              {cadenceLabel(planCadence, planInterval).toLowerCase()} lands it by{' '}
              {format(date, 'd MMM yyyy')}. Use this →
            </button>
          )}
          <DateInput label="First payment" value={planStart} onChange={setPlanStart} />
          {planOutlook && (
            <p
              className={cn(
                'text-[12px]',
                planOutlook.late ? 'text-amber-600' : 'text-ink-500'
              )}
            >
              {planOutlook.payments} payment{planOutlook.payments === 1 ? '' : 's'} gets you there by{' '}
              <span className="font-semibold">{format(planOutlook.finishes, 'MMM yyyy')}</span>
              {planOutlook.late && ', which is after your target date.'}
              {!planOutlook.late && '.'}
            </p>
          )}
          {planned && planAmount > 0 && (
            <p className="text-[12px] text-ink-500">
              {paymentsDueThrough(planStart, planCadence, planInterval, Date.now()) > 0
                ? 'Payments before today count as already due, so anything you have not put in shows as catching up.'
                : 'Nothing is due until the first payment date.'}
            </p>
          )}
        </ToggleCard>

        <ColorPicker colors={ACCENT_PALETTE} value={color} onChange={setColor} />

        <div>
          <div className="mb-2 text-sm font-semibold text-ink-700">Icon</div>
          <div className="grid grid-cols-8 justify-items-center gap-x-1.5 gap-y-2">
            {GOAL_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-card border',
                  icon === ic ? 'border-teal-400 bg-teal-50 text-teal-600' : 'border-parchment-300 text-ink-500'
                )}
                aria-label={ic}
                aria-pressed={icon === ic}
              >
                <Icon name={ic} size={17} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          {goal &&
            (confirmDelete ? (
              <Button
                variant="ghost"
                onClick={() => submit(remove)}
                disabled={pending}
                className="px-3 text-rose-600"
              >
                Really delete?
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                className="px-3 text-ink-500"
              >
                Delete
              </Button>
            ))}
          <Button onClick={() => submit(save)} disabled={!canSave || pending} className="flex-1">
            {goal ? 'Save changes' : 'Create goal'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
