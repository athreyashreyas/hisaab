import { forwardRef } from 'react';
import { format } from 'date-fns';
import { midnight } from '../../lib/repo';
import { cn } from '../../lib/cn';

interface DateInputProps {
  label?: string;
  value: number; // epoch ms (local midnight)
  onChange: (epoch: number) => void;
  className?: string;
  max?: number;
}

/** Native date picker wired to our epoch-ms convention (local midnight). */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { label, value, onChange, className, max },
  ref
) {
  return (
    <div className="w-full">
      {label && <label className="mb-1.5 block text-sm font-semibold text-ink-700">{label}</label>}
      <input
        ref={ref}
        type="date"
        value={format(value, 'yyyy-MM-dd')}
        max={max ? format(max, 'yyyy-MM-dd') : undefined}
        onChange={(e) => {
          if (!e.target.value) return;
          const [y, m, d] = e.target.value.split('-').map(Number);
          onChange(midnight(new Date(y, m - 1, d)));
        }}
        className={cn(
          'w-full rounded-card border-parchment-300 bg-parchment-50 text-ink-900 text-[15px] px-3.5 py-2.5 ' +
            'focus:border-teal-400 focus:ring-teal-400',
          className
        )}
      />
    </div>
  );
});
