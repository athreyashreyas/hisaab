import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { SyncIndicator } from '../ui/SyncIndicator';
import { cn } from '../../lib/cn';

/**
 * Shared page header: an uppercase kicker, a serif title, optional subtitle, and
 * the tappable sync dot (which opens the sync panel). An optional back button for
 * detail screens; optional trailing slot for page actions.
 */
export function PageHeader({
  kicker,
  title,
  subtitle,
  back,
  trailing,
  className,
}: {
  kicker?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: boolean;
  trailing?: React.ReactNode;
  className?: string;
}) {
  const navigate = useNavigate();

  return (
    <header className={cn('mb-1 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0 flex items-start gap-2">
        {back && (
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="-ml-1.5 mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-parchment-200"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="min-w-0">
          {kicker && (
            <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-300">
              {kicker}
            </div>
          )}
          <h1 className="mt-0.5 truncate font-serif text-[26px] leading-tight text-ink-900">{title}</h1>
          {subtitle && <div className="mt-0.5 text-[13px] text-ink-500">{subtitle}</div>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {trailing}
        <SyncIndicator />
      </div>
    </header>
  );
}
