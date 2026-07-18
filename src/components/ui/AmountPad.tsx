import { Delete } from 'lucide-react';
import { formatINR } from '../../lib/calculations';
import { denominationFor } from '../../lib/denominations';
import { cn } from '../../lib/cn';

/**
 * The amount entry surface for quick-add: a big serif rupee figure that grows as
 * you type, over a custom keypad. Works in *paise* internally but the user types
 * rupees-and-paise naturally (each digit shifts in from the right).
 *
 * State is a string of digits meaning paise (e.g. "42050" → ₹420.50). The parent
 * holds `paise`; we translate.
 *
 * The figure takes on the colour of the banknote that would cover the amount
 * (see lib/denominations), so ₹47 glows ₹50-blue and ₹1,800 ₹2,000-magenta — a
 * small, money-native delight. `tint` (the type's accent) still colours the
 * delete key, so income/transfer stay distinguishable from the note colour.
 */
export function AmountPad({
  paise,
  onChange,
  tint = '#1E7F75',
}: {
  paise: number;
  onChange: (paise: number) => void;
  tint?: string;
}) {
  // The note colour tracks the amount; an empty pad rests on the smallest note.
  const noteColor = denominationFor(paise).color;
  const press = (digit: string) => {
    const next = paise * 10 + Number(digit);
    if (next > 9_99_99_99_99) return; // cap ~₹10 crore, keeps the display sane
    onChange(next);
  };
  const backspace = () => onChange(Math.floor(paise / 10));
  const clear = () => onChange(0);

  const rupees = Math.floor(paise / 100);
  const p = String(paise % 100).padStart(2, '0');

  return (
    <div className="flex flex-col">
      {/* Display. The figure carries its banknote colour, easing between notes as
          the amount crosses a denomination. Paise stays dim so the rupees lead. */}
      <div className="flex items-end justify-center py-6">
        <span
          className="mb-1 mr-1 font-serif text-3xl transition-colors duration-300"
          style={{ color: noteColor, opacity: paise > 0 ? 0.7 : 0.4 }}
        >
          ₹
        </span>
        <span
          className="font-serif text-6xl leading-none tabular-nums transition-colors duration-300"
          style={{ color: paise > 0 ? noteColor : undefined }}
        >
          {formatINR(rupees * 100, false).replace('₹', '')}
        </span>
        <span className="mb-1.5 ml-0.5 font-serif text-3xl tabular-nums text-ink-300">.{p}</span>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-1.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <Key key={d} onClick={() => press(d)}>
            {d}
          </Key>
        ))}
        <Key onClick={clear} className="text-base font-semibold text-ink-500">
          C
        </Key>
        <Key onClick={() => press('0')}>0</Key>
        <Key onClick={backspace} aria-label="Delete" style={{ color: tint }}>
          <Delete size={22} />
        </Key>
      </div>
    </div>
  );
}

function Key({
  children,
  onClick,
  className,
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        'grid h-14 place-items-center rounded-card text-2xl font-medium text-ink-900 tabular-nums',
        'transition-colors hover:bg-parchment-200 active:bg-parchment-300',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
