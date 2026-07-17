/**
 * The explicit, user-initiated sync behind the Sync dot's "Sync now" button.
 *
 * Two layers, deliberately in this order:
 *   1. data — push anything queued, pull whatever changed (lib/sync.ts)
 *   2. code — force a newly deployed version to actually land (lib/appUpdate.ts)
 *
 * A green "backed up" dot only ever meant the first one. Someone tapping Sync
 * means "make me current", which is both. Data goes first so a version swap
 * (which reloads the page) can never strand a write that hasn't been sent yet.
 */
import { applyUpdateNow } from './appUpdate';
import { syncNow } from './sync';

export type RefreshOutcome = 'updating' | 'current';

/**
 * Push, pull, then bring the app itself up to the newest deployed version.
 * Returns 'updating' when a reload is imminent, in which case the caller should
 * leave its spinner running: the page is about to tear down under it.
 */
export async function manualRefresh(): Promise<RefreshOutcome> {
  // A data sync failure is already surfaced by the dot going to 'error'; it
  // shouldn't stop us from checking whether new code is waiting.
  try {
    await syncNow();
  } catch {
    // syncNow handles and reports its own errors.
  }

  try {
    return await applyUpdateNow();
  } catch {
    // A failed update check should never make Sync feel broken.
    return 'current';
  }
}
