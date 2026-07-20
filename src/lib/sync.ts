/**
 * Encrypted sync engine. The one hard divergence from Attend/Harmony: the server
 * never sees plaintext. Every outbound row is sealed with the session DEK; every
 * inbound row is opened locally. Supabase stores only {id, table, iv, ct,
 * updated_at, deleted_at} — opaque blobs plus sync metadata.
 *
 * Push: drain sync_queue → sealRecord each dirty row → upsert to `records`.
 * Pull: fetch rows changed since our cursor → openRecord → write plaintext into
 *       Dexie with last-write-wins on updated_at.
 *
 * Every path is guarded by keyring.isUnlocked() and isCloudConfigured(); when
 * either is false the queue simply accumulates and flushes once conditions hold.
 */
import { db } from './db';
import { sealRecord, openRecord, keyring, type Envelope } from './crypto';
import { supabase, isCloudConfigured } from './supabase';
import { useSyncStore } from '../stores/syncStore';
import { useAccountStore } from '../stores/accountStore';
import { currentWrappedKey, currentRecoveryWrap } from './vaultStorage';
import { pushVaultKeys } from './vaultCloud';
import type { SyncTable, SyncMeta } from '../types';

function currentUser() {
  return useAccountStore.getState().user;
}

const CURSOR_KEY = 'hisaab.sync.cursor';

/** Tables whose plaintext rows round-trip through Dexie, keyed as in the schema. */
const TABLES: SyncTable[] = [
  'accounts',
  'categories',
  'transactions',
  'goals',
  'goal_contributions',
  'investments',
  'recurring_rules',
  // Account prefs (e.g. the last "What's new" version seen) ride the same
  // encrypted path as everything else, so they follow you across devices
  // without the server learning a thing. `records.table_name` is free-form
  // text, so a new logical table needs no schema migration.
  'prefs',
];

type AnyRow = SyncMeta & { id: string };

function table(name: SyncTable) {
  return db.table<AnyRow>(name);
}

function getCursor(): string {
  return localStorage.getItem(CURSOR_KEY) ?? new Date(0).toISOString();
}
function setCursor(iso: string) {
  localStorage.setItem(CURSOR_KEY, iso);
}

function setStatus(patch: Partial<ReturnType<typeof useSyncStore.getState>>) {
  useSyncStore.getState().set(patch);
}

async function pendingCount(): Promise<number> {
  return db.sync_queue.count();
}

/** True only when we can actually talk to the cloud with an unlocked vault. */
export function canSync(): boolean {
  return (
    isCloudConfigured() &&
    keyring.isUnlocked() &&
    Boolean(currentUser()) &&
    navigator.onLine
  );
}

// --- vault key backup -----------------------------------------------------

/**
 * Ensure both wrapped DEKs (password wrap + recovery-phrase wrap) live in the
 * cloud (RLS: owner-only) so a new device can unlock with the password and a
 * reset can restore with the recovery phrase. Neither is usable by the server.
 */
export async function pushVaultKey(): Promise<void> {
  const user = currentUser();
  const wrapped = currentWrappedKey();
  if (!user || !wrapped) return;
  await pushVaultKeys(user.id, wrapped, currentRecoveryWrap());
}

// --- push -----------------------------------------------------------------

async function push(): Promise<void> {
  if (!supabase) return;
  const user = currentUser();
  if (!user) return;
  const dek = keyring.get();

  const queue = await db.sync_queue.orderBy('created_at').toArray();
  if (queue.length === 0) return;

  // Collapse to the latest op per (table, record).
  const latest = new Map<string, (typeof queue)[number]>();
  for (const item of queue) latest.set(`${item.table_name}:${item.record_id}`, item);

  // Remember exactly which queue rows this pass covers. Writes made *while* the
  // push is in flight land in the queue behind us, and clearing the table
  // wholesale would drop them: the record would keep synced_at: null with
  // nothing left to retry it, so it would never reach the cloud. Nothing else
  // re-enqueues on synced_at, so that loss is silent and permanent.
  const drainedIds = queue.map((item) => item.id).filter((id): id is number => id !== undefined);

  for (const item of latest.values()) {
    const row = await table(item.table_name).get(item.record_id);

    let payload: { user_id: string; id: string; table_name: SyncTable } & Envelope & {
        updated_at: string;
        deleted_at: string | null;
      };

    if (item.operation === 'delete' || !row || row.deleted_at) {
      // Tombstone: seal a minimal marker so the row's existence still round-trips.
      const sealed = await sealRecord(dek, row ?? { id: item.record_id });
      payload = {
        user_id: user.id,
        id: item.record_id,
        table_name: item.table_name,
        iv: sealed.iv,
        ct: sealed.ct,
        updated_at: new Date(row?.updated_at ?? Date.now()).toISOString(),
        deleted_at: new Date(row?.deleted_at ?? Date.now()).toISOString(),
      };
    } else {
      const sealed = await sealRecord(dek, row);
      payload = {
        user_id: user.id,
        id: row.id,
        table_name: item.table_name,
        iv: sealed.iv,
        ct: sealed.ct,
        updated_at: new Date(row.updated_at).toISOString(),
        deleted_at: null,
      };
    }

    const { error } = await supabase.from('records').upsert(payload);
    if (error) throw error;

    if (row) await table(item.table_name).update(item.record_id, { synced_at: Date.now() });
  }

  await db.sync_queue.bulkDelete(drainedIds);
}

// --- pull -----------------------------------------------------------------

interface RemoteRecord extends Envelope {
  id: string;
  table_name: SyncTable;
  updated_at: string;
  deleted_at: string | null;
}

async function pull(): Promise<void> {
  if (!supabase) return;
  const dek = keyring.get();
  const cursor = getCursor();

  const { data, error } = await supabase
    .from('records')
    .select('id, table_name, iv, ct, updated_at, deleted_at')
    .gt('updated_at', cursor)
    .order('updated_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as RemoteRecord[];
  if (rows.length === 0) return;

  for (const remote of rows) {
    if (!TABLES.includes(remote.table_name)) continue;
    const t = table(remote.table_name);
    const remoteUpdated = new Date(remote.updated_at).getTime();

    const local = await t.get(remote.id);
    // Last-write-wins: skip if our copy is newer.
    if (local && local.updated_at >= remoteUpdated) continue;

    if (remote.deleted_at) {
      // Apply the tombstone locally without resurrecting content.
      await t.put({
        ...(local ?? ({ id: remote.id } as AnyRow)),
        id: remote.id,
        updated_at: remoteUpdated,
        deleted_at: new Date(remote.deleted_at).getTime(),
        synced_at: Date.now(),
      } as AnyRow);
      continue;
    }

    const plain = await openRecord<AnyRow>(dek, { iv: remote.iv, ct: remote.ct });
    await t.put({ ...plain, synced_at: Date.now() });
  }

  setCursor(rows[rows.length - 1].updated_at);
}

// --- orchestration --------------------------------------------------------

let running = false;

/** Run a full sync cycle (push then pull), updating the sync dot as it goes. */
export async function syncNow(): Promise<void> {
  if (!isCloudConfigured()) {
    setStatus({ status: 'local' });
    return;
  }
  if (!keyring.isUnlocked()) {
    setStatus({ status: 'locked', pending: await pendingCount() });
    return;
  }
  if (!currentUser()) {
    setStatus({ status: 'idle', pending: await pendingCount() });
    return;
  }
  if (!navigator.onLine) {
    setStatus({ status: 'offline', pending: await pendingCount() });
    return;
  }
  if (running) return;
  running = true;
  setStatus({ status: 'syncing', pending: await pendingCount(), lastError: null });

  try {
    await pushVaultKey();
    await push();
    await pull();
    setStatus({
      status: 'idle',
      pending: await pendingCount(),
      lastSyncedAt: Date.now(),
      lastError: null,
    });
  } catch (err) {
    console.error('[sync]', err);
    setStatus({
      status: 'error',
      pending: await pendingCount(),
      lastError: err instanceof Error ? err.message : 'Sync failed',
    });
  } finally {
    running = false;
  }
}

/** Refresh just the pending badge + a calm resting status (no network). */
export async function refreshSyncBadge(): Promise<void> {
  const pending = await pendingCount();
  if (!isCloudConfigured()) return setStatus({ status: 'local', pending });
  if (!keyring.isUnlocked()) return setStatus({ status: 'locked', pending });
  if (!navigator.onLine) return setStatus({ status: 'offline', pending });
  setStatus({ pending });
}
