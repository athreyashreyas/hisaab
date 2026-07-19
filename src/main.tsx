import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { initTheme } from './lib/theme';
import './index.css';

// Apply the saved theme to <html> and sync the status-bar tint before the app
// renders. The index.html inline snippet already set data-theme pre-paint; this
// keeps the meta tag and the store in step.
initTheme();

/**
 * Service-worker + auto-update handling, ported from the suite (Attend/Harmony).
 *
 * When workbox detects a new build it calls `onNeedRefresh`. We don't nag with a
 * toast: instead we broadcast `hisaab:updating` (UpdateOverlay listens) and swap
 * to the new SW, which triggers `controllerchange` and one graceful reload.
 *
 * The checks below are what make an *installed* PWA (which can stay open for
 * days without a navigation) look for new versions on its own, so a deploy lands
 * without anyone re-adding their home-screen icon. The Sync button can also
 * force the issue on demand (see lib/appUpdate.ts).
 */
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // hourly

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('hisaab:updating'));
    // Give the overlay a beat to paint before the reload storms in.
    setTimeout(() => updateSW(true), 400);
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    const check = () => {
      registration.update().catch(() => {
        /* offline or transient: try again next interval */
      });
    };
    setInterval(check, UPDATE_CHECK_INTERVAL);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    // Coming back online is a strong moment to look for a shipped update.
    window.addEventListener('online', check);
  },
});

if ('serviceWorker' in navigator) {
  // Whether a worker already controls this page at startup. On the very first
  // visit there is none: the worker installs, calls clientsClaim(), and fires
  // controllerchange for the FIRST time. Reloading on that first claim would
  // restart the app mid-session and throw away in-memory state, such as a
  // half-finished onboarding or an unlocked key. Only reload when an EXISTING
  // controller is replaced by a genuinely new worker, which is the real
  // "an update shipped" case.
  const hadControllerAtStartup = Boolean(navigator.serviceWorker.controller);

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadControllerAtStartup) return;
    if (reloading) return;
    reloading = true;
    window.dispatchEvent(new CustomEvent('hisaab:updating'));
    setTimeout(() => window.location.reload(), 400);
  });
}

// Keep the CSS var for on-screen-keyboard height in sync (iOS-safe layout).
// iOS doesn't shrink the layout viewport (or dvh) for the keyboard, so without
// this a focused field low on the screen makes iOS scroll the whole document to
// reveal it, sliding fixed chrome under the status bar. Sheets read this to lift
// above the keyboard instead.
if ('visualViewport' in window && window.visualViewport) {
  const vv = window.visualViewport;
  const sync = () => {
    const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--keyboard-height', `${Math.round(overlap)}px`);
  };
  sync();
  vv.addEventListener('resize', sync);
  vv.addEventListener('scroll', sync);
  window.addEventListener('orientationchange', sync);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
