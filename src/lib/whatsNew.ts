/**
 * "What's new" gating — ported from Harmony's pattern, adapted for Hisaab.
 *
 * The guide's What's-new pane is shown once when you first meet a newer app
 * version. The seen-marker is tracked two ways, and a release is shown only when
 * it is newer than BOTH:
 *
 *   - a synced value on the encrypted prefs record, so reading it on your phone
 *     suppresses it on your laptop ("once per account");
 *   - this per-device localStorage value, which a Supabase pull can never
 *     clobber — the synced value can briefly read as its pre-sync state when a
 *     pull lands before our write has propagated, which would otherwise
 *     re-trigger the pop-up ("never repeated on a device").
 *
 * Where this deliberately differs from Harmony: Harmony keeps its marker in a
 * plaintext `last_seen_version` column. Hisaab's server only ever holds
 * ciphertext, so the synced half rides the normal sealed `records` path instead
 * (see types/Prefs). Same behaviour, nothing readable on the server.
 *
 * A fresh user who just finished onboarding has already been walked through the
 * app, so onboarding marks the current version as seen — the What's-new screen
 * never greets someone the moment they finish setting up.
 */
import { getPrefs, updatePrefs } from './repo';

const KEY = 'hisaab.lastSeenVersion';

export function getSeenVersionLocal(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setSeenVersionLocal(version: string): void {
  try {
    localStorage.setItem(KEY, version);
  } catch {
    // ignore (private mode / disabled storage)
  }
}

/** The account-wide marker, from the encrypted prefs record (synced). */
export async function getSeenVersionSynced(): Promise<string | null> {
  try {
    return (await getPrefs())?.last_seen_version ?? null;
  } catch {
    return null;
  }
}

/** Record the account-wide marker. Queued and pushed sealed, like any record. */
export async function setSeenVersionSynced(version: string): Promise<void> {
  try {
    await updatePrefs({ last_seen_version: version });
  } catch {
    // A prefs write must never break boot; the local marker still holds.
  }
}

/**
 * The whole decision, in one place: has this account already seen `version`,
 * on this device or any other? Marks it seen on both sides when it hasn't.
 * Returns true when What's new should be shown.
 */
export async function claimUnseenVersion(version: string): Promise<boolean> {
  const local = getSeenVersionLocal();
  const synced = await getSeenVersionSynced();
  const unseen = isNewerVersion(version, local) && isNewerVersion(version, synced);

  // Bring both markers up to date either way. When it's genuinely unseen this
  // is what makes it show exactly once; when another device got there first,
  // this catches up the marker that lagged.
  if (isNewerVersion(version, local)) setSeenVersionLocal(version);
  if (isNewerVersion(version, synced)) void setSeenVersionSynced(version);

  return unseen;
}

/**
 * True if `a` ("x.y.z") is a strictly newer version than `b`. A null/empty `b`
 * counts as older than anything, so a first-ever run is treated as new.
 */
export function isNewerVersion(a: string, b: string | null): boolean {
  if (!b) return true;
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}
