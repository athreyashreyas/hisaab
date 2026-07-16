import { Icon } from './Icon';
import { cn } from '../../lib/cn';

/** Warm, unhurried empty state — encourages the first entry rather than scolding. */
export function EmptyState({
  icon = 'sprout',
  title,
  body,
  action,
  className,
}: {
  icon?: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-teal-50 text-teal-500">
        <Icon name={icon} size={24} />
      </div>
      <h3 className="font-serif text-xl text-ink-900">{title}</h3>
      {body && <p className="mt-1.5 max-w-xs text-sm text-ink-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
