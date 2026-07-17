import { useEffect } from 'react';
import { db } from '../lib/db';
import { liveQuery } from 'dexie';
import { syncNow, refreshSyncBadge } from '../lib/sync';
import { useAccountStore } from '../stores/accountStore';
import { useNetwork } from './useNetwork';

/**
 * Wires the sync engine to app life: debounced flush when the queue grows, a
 * periodic heartbeat, and a re-sync on reconnect / sign-in. Mounted once, inside
 * the unlocked shell. When cloud isn't configured every call cheaply no-ops.
 */
export function useSyncQueue() {
  const online = useNetwork();
  const user = useAccountStore((s) => s.user);

  // Flush shortly after the queue changes (batches rapid multi-entry).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const sub = liveQuery(() => db.sync_queue.count()).subscribe((count) => {
      void refreshSyncBadge();
      if (count > 0) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void syncNow(), 800);
      }
    });
    return () => {
      sub.unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Heartbeat + initial sync.
  useEffect(() => {
    void syncNow();
    const id = setInterval(() => void syncNow(), 60_000);
    return () => clearInterval(id);
  }, []);

  // React to connectivity / auth changes.
  useEffect(() => {
    void syncNow();
  }, [online, user]);
}
