/**
 * Sync status store — drives the tappable sync dot (SyncIndicator).
 *
 * State machine mirrors the suite:
 *   idle    — nothing pending, all confirmed in the cloud
 *   syncing — a push/pull is in flight
 *   offline — no network (queue is safe; it flushes on reconnect)
 *   error   — last attempt failed; retried with backoff
 *   locked  — the vault is locked, so sync is paused until unlock
 *   local   — cloud isn't configured; app is local-only (a calm state, not an error)
 */
import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error' | 'locked' | 'local';

interface SyncState {
  status: SyncStatus;
  pending: number; // rows waiting in sync_queue
  lastSyncedAt: number | null;
  lastError: string | null;
  set: (patch: Partial<Omit<SyncState, 'set'>>) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'local',
  pending: 0,
  lastSyncedAt: null,
  lastError: null,
  set: (patch) => set(patch),
}));
