import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { router } from './router';
import { useVaultStore } from './stores/vaultStore';
import { useAuthStore } from './stores/authStore';
import { useSyncQueue } from './hooks/useSyncQueue';
import { SetupPage } from './pages/SetupPage';
import { UnlockPage } from './pages/UnlockPage';
import { OnboardingFlow } from './pages/onboarding/OnboardingFlow';

/**
 * Boot + vault gate. The router (and thus the whole app) only mounts once the
 * vault is unlocked; before that we show Setup (first run) or Unlock (returning).
 * MotionConfig honours the OS reduced-motion setting across every animation.
 */
export default function App() {
  const vaultStatus = useVaultStore((s) => s.status);
  const onboardedAt = useVaultStore((s) => s.onboardedAt);
  const initVault = useVaultStore((s) => s.init);
  const initAuth = useAuthStore((s) => s.init);

  useEffect(() => {
    initVault();
    void initAuth();
  }, [initVault, initAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">{renderGate()}</MotionConfig>
    </QueryClientProvider>
  );

  function renderGate() {
    if (vaultStatus === 'checking') return <BootSplash />;
    // A fresh account (no vault, no onboarding marker) is walked through the
    // guided first-run, which itself mints the vault partway through. The gate
    // stays on onboarding until it finishes (onboardedAt is set), even though
    // the vault becomes unlocked mid-flow.
    if (onboardedAt === null) return <OnboardingFlow />;
    if (vaultStatus === 'locked') return <UnlockPage />;
    if (vaultStatus === 'unlocked') return <UnlockedApp />;
    // Onboarded but somehow without a vault (rare, e.g. storage cleared): fall
    // back to the standalone setup screen.
    return <SetupPage />;
  }
}

/** Everything behind the vault: sync wiring + the routed shell. */
function UnlockedApp() {
  useSyncQueue();
  return <RouterProvider router={router} />;
}

function BootSplash() {
  return (
    <div className="grid h-full w-full place-items-center bg-parchment-100">
      <div className="flex flex-col items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-teal-500 font-serif text-2xl text-white">
          ₹
        </div>
        <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse-dot" />
      </div>
    </div>
  );
}
