/**
 * The code layer of "sync". Ported from Harmony's appUpdate.ts.
 *
 * There are two independent things people mean by synced. The data layer is your
 * ledger going up to Supabase and back (lib/sync.ts, the teal dot). The code
 * layer is this file: swapping in a newly deployed bundle, which is how a fix or
 * a new screen actually arrives. On stubborn platforms, notably an iOS
 * home-screen PWA, a running service worker can refuse to swap even when a new
 * one is deployed, so the app sits on old code while data sync happily reports
 * "backed up". These helpers make an update actually land, without anyone having
 * to delete and re-add the home-screen icon.
 *
 * IMPORTANT: nothing here touches IndexedDB, where the ledger lives. The
 * heaviest thing we ever do is drop the service worker's asset cache, which
 * re-downloads from the network. Your data is never at risk, encrypted or not.
 */

// The build running in this tab, injected at build time (see vite.config.ts).
// The typeof guard keeps this safe anywhere the define is absent.
const RUNNING_BUILD: string = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';

/**
 * Is the server serving a newer build than the one running here? Probed via a
 * tiny version.json emitted at build time, fetched no-store so neither the HTTP
 * cache nor the service worker's precache can mask a fresh deploy. version.json
 * is deliberately left out of the precache and served no-cache (vercel.json).
 */
async function serverHasNewerBuild(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000); // never hang on a probe
    const res = await fetch('/version.json', { cache: 'no-store', signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = (await res.json()) as { build?: string };
    return typeof data.build === 'string' && data.build !== RUNNING_BUILD;
  } catch {
    return false;
  }
}

/**
 * Resolve to `fallback` if `p` hasn't settled within `ms`, so a slow or wedged
 * network call can never hang the Sync button. A rejection falls back too: a
 * failed update check should be invisible, not fatal.
 */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const finish = (v: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(v);
    };
    const timer = setTimeout(() => finish(fallback), ms);
    p.then(finish, () => finish(fallback));
  });
}

const RECOVER_KEY = 'hisaab.lastHardRecover';

/**
 * Last resort, for when a new version is deployed but the worker will not swap
 * on its own: unregister the worker(s), delete the asset caches, and reload
 * straight from the network. IndexedDB is untouched, so nothing is lost, and the
 * home-screen app stays installed. Guarded to at most once every two minutes per
 * tab, so a transient version.json mismatch (CDN lag right after a deploy) can
 * never spin the app into a reload loop.
 */
async function hardRecover(): Promise<void> {
  if (!navigator.onLine) return; // offline: nothing to fetch, keep serving cache
  try {
    const last = Number(sessionStorage.getItem(RECOVER_KEY) ?? '0');
    if (Date.now() - last < 120_000) return;
    sessionStorage.setItem(RECOVER_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable (private mode): proceed once, no persistent guard
  }

  window.dispatchEvent(new CustomEvent('hisaab:updating'));
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    // ignore: the reload below still gets fresher assets than we have now
  }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k))); // asset caches only, never IndexedDB
  } catch {
    // ignore
  }
  // A beat for the overlay to paint, so the swap reads as one screen.
  setTimeout(() => window.location.reload(), 400);
}

/**
 * Force the app to pick up a newly deployed version if there is one.
 *
 * Graceful path first: ask the worker to check, and if a new one is installing
 * or waiting, tell it to take over now (main.tsx then reloads on
 * controllerchange). If nothing surfaces but the server genuinely has a newer
 * build, the worker is wedged, so fall back to a hard recover. Resolves
 * 'updating' when a reload is imminent, 'current' when already up to date.
 */
export async function applyUpdateNow(): Promise<'updating' | 'current'> {
  if (!('serviceWorker' in navigator)) return 'current';

  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return 'current';

  // Watch for a graceful swap kicking off during this call, so we don't also
  // trigger a redundant hard recover while main.tsx is already reloading.
  let controllerChanged = false;
  const onControllerChange = () => {
    controllerChanged = true;
  };
  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
  try {
    // Ask the worker to check AND probe the deployed build id at the same time,
    // each time-boxed. In parallel rather than sequentially, so the Sync button
    // stays responsive; the timeouts keep it from ever hanging.
    const [, newer] = await Promise.all([
      withTimeout(reg.update(), 4000, undefined),
      withTimeout(serverHasNewerBuild(), 4000, false),
    ]);

    // update() surfaced a new worker: take the graceful swap. main.tsx reloads
    // on controllerchange.
    const pending = reg.waiting ?? reg.installing;
    if (pending) {
      window.dispatchEvent(new CustomEvent('hisaab:updating'));
      pending.postMessage({ type: 'SKIP_WAITING' });
      return 'updating';
    }

    // A graceful swap already fired (or is firing): let main.tsx do the reload.
    if (controllerChanged) return 'updating';

    // Nothing surfaced but the server is genuinely ahead: the worker is wedged.
    if (newer) {
      await hardRecover();
      return 'updating';
    }
    return 'current';
  } finally {
    navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }
}
