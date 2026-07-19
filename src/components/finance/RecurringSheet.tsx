import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DateInput } from '../ui/DateInput';
import { AmountPad } from '../ui/AmountPad';
import { Segmented, AccountPicker, CategoryPicker } from '../add/Pickers';
import { useAccounts, useCategories } from '../../hooks/useData';
import {
  createRecurringRule,
  updateRecurringRule,
  deleteRecurringRule,
  midnight,
} from '../../lib/repo';
import { guessCategory } from '../../lib/categories';
import { rollForward } from '../../lib/calculations';
import type { Cadence, RecurringRule } from '../../types';

const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

/**
 * Manual add / edit for a recurring payment (rent, subscriptions, SIPs…). This
 * is the counterpart to Insights' auto-detected suggestions: not every bill
 * shows up in transaction history yet, and a fresh account has none, so the user
 * needs a way to declare one outright. Confirmed rules feed "Bills to come" on
 * the home hero.
 */
export function RecurringSheet({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: RecurringRule | null;
}) {
  const accounts = useAccounts();
  const categories = useCategories();

  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState(0);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [cadence, setCadence] = useState<Cadence>('monthly');
  const [nextDue, setNextDue] = useState(() => midnight());
  const [categoryTouched, setCategoryTouched] = useState(false);

  const isEdit = Boolean(editing);

  // Hydrate on open — either the edit target, or sensible fresh defaults.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setMerchant(editing.merchant);
      setAmount(editing.amount);
      setAccountId(editing.account_id);
      setCategoryId(editing.category_id);
      setCadence(editing.cadence);
      setNextDue(editing.next_due);
      setCategoryTouched(true);
    } else {
      setMerchant('');
      setAmount(0);
      setAccountId(accounts[0]?.id ?? null);
      setCategoryId(null);
      setCadence('monthly');
      setNextDue(midnight());
      setCategoryTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  // Default the account once accounts load.
  useEffect(() => {
    if (open && !accountId && accounts[0]) setAccountId(accounts[0].id);
  }, [open, accountId, accounts]);

  // Auto-suggest a category from the merchant until the user picks one.
  useEffect(() => {
    if (categoryTouched || !merchant.trim()) return;
    const guessName = guessCategory(merchant);
    if (!guessName) return;
    const match = categories.find((c) => c.name === guessName);
    if (match) setCategoryId(match.id);
  }, [merchant, categoryTouched, categories]);

  const canSave = amount > 0 && merchant.trim().length > 0 && accountId != null;

  // A next-due in the past is easy to pick; roll it forward to the next real hit
  // so "Bills to come" and the "Next …" label stay honest.
  const anchorDate = new Date(nextDue);

  async function save() {
    if (!canSave || !accountId) return;
    const due = rollForward(nextDue, cadence);
    const payload = {
      merchant: merchant.trim(),
      amount,
      account_id: accountId,
      category_id: categoryId,
      cadence,
      anchor: cadence === 'weekly' ? anchorDate.getDay() : anchorDate.getDate(),
      next_due: due,
    };
    if (editing) {
      await updateRecurringRule(editing.id, payload);
    } else {
      await createRecurringRule({ ...payload, confirmed: true, active: true });
    }
    onClose();
  }

  async function remove() {
    if (!editing) return;
    await deleteRecurringRule(editing.id);
    onClose();
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit recurring payment' : 'Add recurring payment'}
    >
      <div className="space-y-5 px-5 pb-6 pt-2">
        <AmountPad paise={amount} onChange={setAmount} tint="#B4884A" />

        <Input
          label="Payee"
          placeholder="Rent, Netflix, SIP…"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
        />

        <div>
          <div className="mb-1.5 text-sm font-semibold text-ink-700">Repeats</div>
          <Segmented options={CADENCE_OPTIONS} value={cadence} onChange={setCadence} />
        </div>

        <AccountPicker
          accounts={accounts}
          value={accountId}
          onChange={setAccountId}
          label="Account"
        />

        <div>
          <div className="mb-1.5 text-sm font-semibold text-ink-700">Category</div>
          <CategoryPicker
            categories={categories}
            value={categoryId}
            onChange={(id) => {
              setCategoryId(id);
              setCategoryTouched(true);
            }}
          />
        </div>

        <DateInput label="Next due" value={nextDue} onChange={setNextDue} />

        <div className="flex items-center gap-2 pt-1">
          {isEdit && (
            <Button
              variant="ghost"
              onClick={remove}
              aria-label="Delete"
              className="px-3 text-rose-600"
            >
              <Trash2 size={18} />
            </Button>
          )}
          <Button onClick={save} disabled={!canSave} className="flex-1">
            {isEdit ? 'Save changes' : 'Add payment'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
