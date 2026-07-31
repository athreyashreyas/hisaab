import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * The swatch grid used everywhere a colour is chosen: accounts, goals,
 * investments, categories.
 *
 * Laid out as an eight-column grid with the swatches centred in their cells, so
 * a sixteen-colour palette reads as two even rows that fill the sheet rather than
 * a ragged left-aligned wrap. The chosen swatch carries a tick as well as a ring
 * — the ring alone is easy to miss on a dark swatch, and it's the only signal of
 * what's currently set when a form is reopened for editing.
 */
export function ColorPicker({
  colors,
  value,
  onChange,
  label = 'Colour',
}: {
  colors: string[];
  value: string;
  onChange: (color: string) => void;
  label?: string | null;
}) {
  return (
    <div>
      {label && <div className="mb-2 text-sm font-semibold text-ink-700">{label}</div>}
      <div className="grid grid-cols-8 justify-items-center gap-x-1.5 gap-y-2.5">
        {colors.map((c) => {
          const active = value === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              aria-label={`Colour ${c}`}
              aria-pressed={active}
              className={cn(
                'grid h-8 w-8 place-items-center rounded-full transition-transform',
                active && 'scale-110 ring-2 ring-offset-2 ring-offset-parchment-100'
              )}
              style={{ backgroundColor: c, ...(active ? { '--tw-ring-color': c } as React.CSSProperties : null) }}
            >
              {active && <Check size={15} strokeWidth={3} className="text-white" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
