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

/**
 * Section header row + optional trailing link/action (mockup .sec). Defaults to
 * the serif title; pass `subtle` for the subordinate uppercase-label style, which
 * steps a section down so a serif hero/page title clearly leads the screen.
 */
export function SectionHeader({
  title,
  action,
  subtle = false,
  className,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  subtle?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('mb-2.5 mt-6 flex items-baseline justify-between px-0.5', className)}>
      {subtle ? (
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">{title}</h2>
      ) : (
        <h2 className="font-serif text-lg text-ink-900">{title}</h2>
      )}
      {action}
    </div>
  );
}
