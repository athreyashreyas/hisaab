import { useEffect, useMemo, useState } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DateInput } from '../ui/DateInput';
import { AmountPad } from '../ui/AmountPad';
import { Segmented, AccountPicker, CategoryPicker } from './Pickers';
import { useUIStore } from '../../stores/uiStore';
import { useAccounts, useCategories } from '../../hooks/useData';
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  midnight,
} from '../../lib/repo';
import { guessCategory } from '../../lib/categories';
import type { TxnType } from '../../types';
import { ArrowRight, Trash2 } from 'lucide-react';

/**
 * Quick-add / edit sheet, opened from the FAB (and from a ledger row for edit).
 * Amount pad leads; the type toggle, account, category, merchant, date and an
 * optional note follow. `guessCategory` pre-selects a category from the merchant
 * so the common case is a couple of taps. "Save & add another" keeps the sheet
 * open for fast multi-entry.
 */
export function AddSheet() {
  const { addSheetOpen, editingTxn, closeAdd } = useUIStore();
  const accounts = useAccounts();
  const categories = useCategories();

  const [amount, setAmount] = useState(0);
  const [type, setType] = useState<TxnType>('expense');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => midnight());
  const [categoryTouched, setCategoryTouched] = useState(false);

  const isEdit = Boolean(editingTxn);

  // Hydrate the form whenever the sheet opens (fresh add, or an edit target).
  useEffect(() => {
    if (!addSheetOpen) return;
    if (editingTxn) {
      setAmount(editingTxn.amount);
      setType(editingTxn.type);
      setAccountId(editingTxn.account_id);
      setToAccountId(editingTxn.to_account_id);
      setCategoryId(editingTxn.category_id);
      setMerchant(editingTxn.merchant);
      setNote(editingTxn.note);
      setDate(editingTxn.date);
      setCategoryTouched(true);
    } else {
      setAmount(0);
      setType('expense');
      setAccountId(accounts[0]?.id ?? null);
      setToAccountId(null);
      setCategoryId(null);
      setMerchant('');
      setNote('');
      setDate(midnight());
      setCategoryTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSheetOpen, editingTxn]);

  // Default the account once accounts load.
  useEffect(() => {
    if (addSheetOpen && !accountId && accounts[0]) setAccountId(accounts[0].id);
  }, [addSheetOpen, accountId, accounts]);

  // Auto-suggest a category from the merchant until the user picks one.
  useEffect(() => {
    if (type !== 'expense' || categoryTouched || !merchant.trim()) return;
    const guessName = guessCategory(merchant);
    if (!guessName) return;
    const match = categories.find((c) => c.name === guessName);
    if (match) setCategoryId(match.id);
  }, [merchant, type, categoryTouched, categories]);

  const canSave =
    amount > 0 &&
    accountId != null &&
    (type !== 'transfer' || (toAccountId != null && toAccountId !== accountId));

  const reset = () => {
    setAmount(0);
    setMerchant('');
    setNote('');
    setCategoryId(null);
    setCategoryTouched(false);
    setDate(midnight());
  };

  async function save(addAnother: boolean) {
    if (!canSave || !accountId) return;
    const payload = {
      type,
      amount,
      account_id: accountId,
      to_account_id: type === 'transfer' ? toAccountId : null,
      category_id: type === 'transfer' ? null : categoryId,
      merchant: merchant.trim(),
      note: note.trim(),
      date,
    };
    if (editingTxn) {
      await updateTransaction(editingTxn.id, payload);
    } else {
      await createTransaction(payload);
    }
    if (addAnother && !editingTxn) {
      reset();
    } else {
      closeAdd();
    }
  }

  async function remove() {
    if (!editingTxn) return;
    await deleteTransaction(editingTxn.id);
    closeAdd();
  }

  const typeOptions = useMemo(
    () => [
      { value: 'expense' as const, label: 'Expense' },
      { value: 'income' as const, label: 'Income' },
      { value: 'transfer' as const, label: 'Transfer' },
    ],
    []
  );

  const tint = type === 'income' ? '#6E9B61' : type === 'transfer' ? '#3E7CA1' : 'var(--teal-500)';

  return (
    <BottomSheet open={addSheetOpen} onClose={closeAdd} title={isEdit ? 'Edit entry' : 'Add entry'}>
      <div className="space-y-5 px-5 pb-6 pt-2">
        <Segmented options={typeOptions} value={type} onChange={setType} />

        <AmountPad paise={amount} onChange={setAmount} tint={tint} />

        {type === 'transfer' ? (
          <div className="space-y-3">
            <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} label="From" />
            <div className="flex items-center gap-2 text-ink-300">
              <ArrowRight size={16} />
              <span className="text-xs font-semibold uppercase tracking-wide">to</span>
            </div>
            <AccountPicker
              accounts={accounts.filter((a) => a.id !== accountId)}
              value={toAccountId}
              onChange={setToAccountId}
              label="To"
            />
          </div>
        ) : (
          <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} label="Account" />
        )}

        <Input
          label="Merchant"
          placeholder={type === 'income' ? 'Salary, refund…' : 'Third Wave Coffee, Uber…'}
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
        />

        {type !== 'transfer' && (
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
        )}

        <div className="grid grid-cols-2 gap-3">
          <DateInput label="Date" value={date} onChange={setDate} max={midnight()} />
          <Input
            label="Note"
            placeholder="Optional"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          {isEdit && (
            <Button variant="ghost" onClick={remove} aria-label="Delete" className="px-3 text-rose-600">
              <Trash2 size={18} />
            </Button>
          )}
          {!isEdit && (
            <Button variant="secondary" onClick={() => save(true)} disabled={!canSave} className="flex-1">
              Save &amp; add another
            </Button>
          )}
          <Button onClick={() => save(false)} disabled={!canSave} className="flex-1">
            {isEdit ? 'Save changes' : 'Save'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
