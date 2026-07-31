import { Icon } from './Icon';
import { cn } from '../../lib/cn';

/**
 * An optional block of a form: a switch with a title and a line of explanation,
 * and the settings it controls tucked underneath, revealed only when it's on.
 *
 * Used for the parts of a form that most entries won't need — "repeat this",
 * "invest on a schedule", "save on a schedule" — so the common path stays short
 * and the extra machinery is there when it's wanted.
 */
export function ToggleCard({
  icon,
  title,
  description,
  on,
  onToggle,
  children,
}: {
  icon: string;
  title: string;
  description: string;
  on: boolean;
  onToggle: (on: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-parchment-300 bg-parchment-50/60 p-3">
      <button
        type="button"
        onClick={() => onToggle(!on)}
        className="flex w-full items-center gap-2.5 text-left"
        aria-pressed={on}
      >
        <span
          className={cn(
            'grid h-8 w-8 shrink-0 place-items-center rounded-[9px]',
            on ? 'bg-teal-500 text-[color:var(--on-primary)]' : 'bg-parchment-200 text-ink-500'
          )}
        >
          <Icon name={icon} size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink-900">{title}</span>
          <span className="block text-[12px] text-ink-500">{description}</span>
        </span>
        <span
          className={cn(
            'relative h-6 w-10 shrink-0 rounded-full transition-colors',
            on ? 'bg-teal-500' : 'bg-parchment-300'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
              on ? 'left-[1.125rem]' : 'left-0.5'
            )}
          />
        </span>
      </button>
      {on && children && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}
