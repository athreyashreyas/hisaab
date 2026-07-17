import { useSyncStore, type SyncStatus } from '../../stores/syncStore';
import { cn } from '../../lib/cn';

/**
 * The family's tappable sync dot. Colour encodes state; tapping it opens the
 * changelog / version modal (wired by the caller). Pulses while syncing.
 */
const dotColor: Record<SyncStatus, string> = {
  idle: 'bg-teal-500',
  syncing: 'bg-teal-400 animate-pulse-dot',
  offline: 'bg-ink-300',
  error: 'bg-rose-500',
  locked: 'bg-amber-500',
  local: 'bg-ink-300',
};

const dotRing: Record<SyncStatus, string> = {
  idle: 'ring-teal-50',
  syncing: 'ring-teal-50',
  offline: 'ring-parchment-200',
  error: 'ring-rose-100',
  locked: 'ring-amber-100',
  local: 'ring-parchment-200',
};

export const SYNC_LABEL: Record<SyncStatus, string> = {
  idle: 'All changes backed up',
  syncing: 'Backing up…',
  offline: 'Offline, will back up when reconnected',
  error: 'Backup ran into a problem',
  locked: 'Vault locked, backup paused',
  local: 'On this device only',
};

export function SyncIndicator({ onClick, className }: { onClick?: () => void; className?: string }) {
  const { status, pending } = useSyncStore();
  return (
    <button
      onClick={onClick}
      title={SYNC_LABEL[status]}
      aria-label={SYNC_LABEL[status]}
      className={cn('relative grid h-9 w-9 place-items-center rounded-full hover:bg-parchment-200', className)}
    >
      <span className={cn('h-2.5 w-2.5 rounded-full ring-4', dotColor[status], dotRing[status])} />
      {pending > 0 && status !== 'idle' && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-teal-600 px-1 text-[9px] font-bold text-white tabular-nums">
          {pending > 99 ? '99+' : pending}
        </span>
      )}
    </button>
  );
}
