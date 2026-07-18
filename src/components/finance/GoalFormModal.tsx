import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DateInput } from '../ui/DateInput';
import { Icon } from '../ui/Icon';
import { createGoal, updateGoal, deleteGoal, midnight } from '../../lib/repo';
import { ACCENT_PALETTE } from '../../lib/categories';
import type { Goal } from '../../types';
import { cn } from '../../lib/cn';

const GOAL_ICONS = ['target', 'plane', 'gift', 'home', 'car', 'graduation-cap', 'heart', 'piggy-bank'];

/** Create or edit a goal: name, target, optional deadline, colour + icon. */
export function GoalFormModal({
  open,
  onClose,
  goal,
}: {
  open: boolean;
  onClose: () => void;
  goal?: Goal | null;
}) {
  const [name, setName] = useState('');
  const [rupees, setRupees] = useState('');
  const [hasDate, setHasDate] = useState(false);
  const [date, setDate] = useState(() => midnight());
  const [color, setColor] = useState(ACCENT_PALETTE[0]);
  const [icon, setIcon] = useState('target');

  useEffect(() => {
    if (!open) return;
    if (goal) {
      setName(goal.name);
      setRupees(String(Math.round(goal.target / 100)));
      setHasDate(goal.target_date != null);
      setDate(goal.target_date ?? midnight());
      setColor(goal.color);
      setIcon(goal.icon);
    } else {
      setName('');
      setRupees('');
      setHasDate(false);
      setDate(midnight());
      setColor(ACCENT_PALETTE[0]);
      setIcon('target');
    }
  }, [open, goal]);

  const target = Math.round(Number(rupees) * 100);
  const canSave = name.trim().length > 0 && target > 0;

  async function save() {
    if (!canSave) return;
    const payload = { name: name.trim(), target, color, icon, target_date: hasDate ? date : null };
    if (goal) await updateGoal(goal.id, payload);
    else await createGoal(payload);
    onClose();
  }

  async function remove() {
    if (goal) await deleteGoal(goal.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={goal ? 'Edit goal' : 'New goal'}>
      <div className="space-y-4 px-5 py-4">
        <Input label="Name" placeholder="Kerala trip, new phone…" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Target amount"
          inputMode="numeric"
          placeholder="50000"
          value={rupees}
          onChange={(e) => setRupees(e.target.value.replace(/[^0-9]/g, ''))}
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

        <div>
          <div className="mb-1.5 text-sm font-semibold text-ink-700">Colour</div>
          <div className="flex gap-2">
            {ACCENT_PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn('h-8 w-8 rounded-full transition-transform', color === c && 'ring-2 ring-offset-2 ring-offset-parchment-100 scale-110')}
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                aria-label={`Colour ${c}`}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-sm font-semibold text-ink-700">Icon</div>
          <div className="flex flex-wrap gap-2">
            {GOAL_ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-card border',
                  icon === ic ? 'border-teal-400 bg-teal-50 text-teal-600' : 'border-parchment-300 text-ink-500'
                )}
                aria-label={ic}
              >
                <Icon name={ic} size={17} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          {goal && (
            <Button variant="ghost" onClick={remove} className="px-3 text-rose-600">
              Delete
            </Button>
          )}
          <Button onClick={save} disabled={!canSave} className="flex-1">
            {goal ? 'Save changes' : 'Create goal'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
