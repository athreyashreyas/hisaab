import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { AmountPad } from './AmountPad';
import { Button } from './Button';
import { Money } from './Money';
import { cn } from '../../lib/cn';

/**
 * A money field that opens Hisaab's own keypad instead of the phone's keyboard.
 *
 * Every amount in the app is entered the same way: tap the field, the amount pad
 * slides up with the big serif figure taking its banknote colour, and Done writes
 * it back. That's already how the Add sheet works, and letting an opening balance
 * or a goal target fall back to the OS numeric keyboard made those screens feel
 * like a different app — with a different idea of what a number is (the OS pad
 * offers a decimal point that then has to be parsed and sanitised; this one works
 * in paise, so ₹1,240.50 is just the digits 1 2 4 0 5 0).
 *
 * Value in and out is integer paise, like everywhere else. `allowNegative` adds a
 * sign toggle, for the one field that needs it (an overdrawn opening balance).
 */
export function AmountField({
  label,
  value,
  onChange,
  hint,
  error,
  placeholder = 'Tap to enter',
  allowNegative = false,
  title,
  className,
}: {
  label?: string;
  /** Integer paise. */
  value: number;
  onChange: (paise: number) => void;
  hint?: string;
  error?: string;
  /** Shown in place of the figure while the field is still empty. */
  placeholder?: string;
  allowNegative?: boolean;
  /** Sheet heading; defaults to the label. */
  title?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(0);
  const [negative, setNegative] = useState(false);

  function openPad() {
    setDraft(Math.abs(value));
    setNegative(value < 0);
    setOpen(true);
  }

  function commit() {
    onChange(negative ? -Math.abs(draft) : draft);
    setOpen(false);
  }

  const empty = value === 0;

  return (
    <div className={cn('w-full', className)}>
      {label && <div className="mb-1.5 text-sm font-semibold text-ink-700">{label}</div>}
      <button
        type="button"
        onClick={openPad}
        className={cn(
          'flex w-full items-center justify-between rounded-card border bg-parchment-50 px-3.5 py-2.5 text-left transition-colors',
          error ? 'border-rose-500' : 'border-parchment-300 hover:border-teal-400'
        )}
      >
        {empty ? (
          <span className="text-[15px] text-ink-250">{placeholder}</span>
        ) : (
          <Money paise={value} sign={value < 0 ? '-' : null} className="text-[17px] text-ink-900" />
        )}
        <span className="ml-3 shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-teal-600">
          {empty ? 'Enter' : 'Change'}
        </span>
      </button>
      {error ? (
        <p className="mt-1.5 text-sm text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-ink-500">{hint}</p>
      ) : null}

      <BottomSheet open={open} onClose={() => setOpen(false)} title={title ?? label ?? 'Amount'}>
        <div className="px-5 pb-5">
          <AmountPad paise={draft} onChange={setDraft} />
          {allowNegative && (
            <button
              type="button"
              onClick={() => setNegative((v) => !v)}
              aria-pressed={negative}
              className={cn(
                'mt-3 flex w-full items-center justify-center gap-2 rounded-card border py-2.5 text-sm font-semibold transition-colors',
                negative
                  ? 'border-rose-500 bg-rose-50 text-rose-600'
                  : 'border-parchment-300 bg-parchment-50 text-ink-500'
              )}
            >
              {negative ? <Minus size={15} /> : <Plus size={15} />}
              {negative ? 'In the red (negative)' : 'In credit (positive)'}
            </button>
          )}
          <Button block onClick={commit} className="mt-3">
            Done
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
