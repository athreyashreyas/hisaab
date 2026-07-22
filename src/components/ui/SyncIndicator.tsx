import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Modal } from './Modal';
import { useSyncStore, type SyncStatus } from '../../stores/syncStore';
import { manualRefresh } from '../../lib/refresh';
import { APP_VERSION } from '../../lib/changelog';
import { cn } from '../../lib/cn';

/**
 * The family's tappable sync dot. Colour encodes state, and tapping it opens a
 * panel that says plainly what is happening and lets you sync on demand.
 *
 * "Sync" here means both layers: your ledger goes up and comes back down, and
 * the app itself checks for a newly deployed version and takes it (lib/refresh).
 * That second half is the reason this button earns its place: an installed PWA
 * can otherwise sit on old code for days, and the alternative is asking someone
 * to delete and re-add their home-screen icon.
 */
const dotColor: Record<SyncStatus, string> = {
  idle: 'bg-teal-500',
  syncing: 'bg-teal-400 animate-pulse-dot',
  offline: 'bg-ink-250',
  error: 'bg-rose-500',
  locked: 'bg-amber-500',
  local: 'bg-ink-250',
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

const COPY: Record<SyncStatus, { heading: string; body: string }> = {
  idle: {
    heading: "Everything's backed up",
    body: 'Your ledger is in step across your devices, sealed the whole way there and back.',
  },
  syncing: {
    heading: 'Backing up',
    body: 'Sending up what you have added, and pulling in anything new from your account.',
  },
  offline: {
    heading: "You're offline",
    body: 'Your entries are safe on this device and will back up the moment you reconnect. Nothing is lost in the meantime.',
  },
  error: {
    heading: 'Backup ran into a problem',
    body: 'Your entries are still safe on this device. Hisaab will keep trying on its own, and you can try again right now.',
  },
  locked: {
    heading: 'Your ledger is locked',
    body: 'Backup picks up again as soon as you unlock, and nothing is lost while it waits.',
  },
  local: {
    heading: 'On this device only',
    body: 'Cloud backup is not set up, so everything stays right here. That works perfectly well, and nothing leaves your phone.',
  },
};

export function SyncIndicator({ className }: { className?: string }) {
  const { status, pending, lastSyncedAt } = useSyncStore();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const navigate = useNavigate();

  const busy = running || status === 'syncing';
  const copy = COPY[status];
  const canSync = status === 'idle' || status === 'syncing' || status === 'error';

  async function handleSync() {
    if (busy || !canSync) return;
    setRunning(true);
    try {
      const outcome = await manualRefresh();
      // 'updating' means a reload is imminent, so leave the button busy rather
      // than flashing "done" a heartbeat before the page tears down.
      if (outcome === 'updating') return;
      setRunning(false);
    } catch {
      setRunning(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={SYNC_LABEL[status]}
        aria-label={`${SYNC_LABEL[status]}. Open to sync.`}
        className={cn(
          'relative grid h-9 w-9 place-items-center rounded-full hover:bg-parchment-200',
          className
        )}
      >
        <span className={cn('h-2.5 w-2.5 rounded-full ring-4', dotColor[status], dotRing[status])} />
        {pending > 0 && status !== 'idle' && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-teal-600 px-1 text-[9px] font-bold text-white tabular-nums">
            {pending > 99 ? '99+' : pending}
          </span>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Sync">
        <div className="space-y-4 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', dotColor[status])} />
            <span className="text-sm font-semibold text-ink-900">{copy.heading}</span>
          </div>

          <p className="text-sm leading-relaxed text-ink-500">{copy.body}</p>

          {pending > 0 && (
            <p className="text-sm text-ink-500">
              {pending} change{pending === 1 ? '' : 's'} waiting to go up.
            </p>
          )}

          {canSync ? (
            <button
              onClick={handleSync}
              disabled={busy}
              className="w-full rounded-full bg-teal-500 py-3 text-sm font-semibold text-white transition-opacity hover:bg-teal-600 disabled:opacity-40"
            >
              {busy ? 'Syncing…' : status === 'idle' ? 'Sync again' : 'Sync now'}
            </button>
          ) : (
            <p className="text-xs leading-relaxed text-ink-300">
              {status === 'offline'
                ? 'Connect to the internet to sync. Your changes are kept safe here until then, and go up on their own once you are back.'
                : status === 'locked'
                  ? 'Unlock your ledger and backup carries on where it left off.'
                  : 'Sign in from Settings if you would like an encrypted backup across your devices.'}
            </p>
          )}

          {lastSyncedAt && (
            <p className="text-center text-xs text-ink-300">
              Last backed up {formatDistanceToNow(lastSyncedAt, { addSuffix: true })}.
            </p>
          )}

          <div className="border-t border-parchment-200 pt-3 text-center">
            <p className="text-xs text-ink-300">
              Hisaab {APP_VERSION}. Syncing also looks for a new version.
            </p>
            <button
              onClick={() => {
                setOpen(false);
                navigate('/guide?pane=new');
              }}
              className="mt-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              What's new
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
