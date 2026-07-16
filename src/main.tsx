import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

/**
 * Service-worker + auto-update handling, ported from the suite (Attend/Harmony).
 *
 * When workbox detects a new build it calls `onNeedRefresh`. We don't nag with a
 * toast — instead we broadcast `hisaab:updating` (UpdateOverlay listens) and swap
 * to the new SW, which triggers `controllerchange` → a single graceful reload.
 * We also re-check for updates on focus/visibility so a long-lived tab doesn't
 * drift behind a deploy.
 */
const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('hisaab:updating'));
    // Give the overlay a beat to paint before the reload storms in.
    setTimeout(() => updateSW(true), 400);
  },
});

let reloading = false;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  const recheck = () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then((r) => r?.update());
    }
  };
  window.addEventListener('focus', recheck);
  document.addEventListener('visibilitychange', recheck);
}

// Keep the CSS var for on-screen-keyboard height in sync (iOS-safe layout).
if ('visualViewport' in window && window.visualViewport) {
  const vv = window.visualViewport;
  const sync = () => {
    const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--keyboard-height', `${overlap}px`);
  };
  vv.addEventListener('resize', sync);
  vv.addEventListener('scroll', sync);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
