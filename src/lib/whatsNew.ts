/**
 * "What's new" gating — ported from Harmony's pattern, adapted for Hisaab.
 *
 * The guide's What's-new pane is shown once when this device first meets a newer
 * app version. We remember the last-seen version in localStorage (per device),
 * so a Supabase pull can never clobber it and reopening on a version already seen
 * never re-triggers the pop-up.
 *
 * A fresh user who just finished onboarding has already been walked through the
 * app, so onboarding marks the current version as seen — the What's-new screen
 * never greets someone the moment they finish setting up.
 */
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
