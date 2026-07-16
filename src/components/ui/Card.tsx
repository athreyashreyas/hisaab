import { cn } from '../../lib/cn';

/** The parchment card surface used across every screen (see mockup .card). */
export function Card({
  children,
  className,
  as: Tag = 'div',
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: 'div' | 'section' | 'button' }) {
  return (
    <Tag
      className={cn(
        'rounded-card border border-parchment-200 bg-parchment-50 shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** Section header row: serif title + optional trailing link/action (mockup .sec). */
export function SectionHeader({
  title,
  action,
  className,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-2.5 mt-6 flex items-baseline justify-between px-0.5', className)}>
      <h2 className="font-serif text-lg text-ink-900">{title}</h2>
      {action}
    </div>
  );
}
