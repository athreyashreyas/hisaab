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

/**
 * Boot + vault gate. The router (and thus the whole app) only mounts once the
 * vault is unlocked; before that we show Setup (first run) or Unlock (returning).
 * MotionConfig honours the OS reduced-motion setting across every animation.
 */
export default function App() {
  const vaultStatus = useVaultStore((s) => s.status);
  const initVault = useVaultStore((s) => s.init);
  const initAuth = useAuthStore((s) => s.init);

  useEffect(() => {
    initVault();
    void initAuth();
  }, [initVault, initAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        {vaultStatus === 'checking' && <BootSplash />}
        {vaultStatus === 'needs-setup' && <SetupPage />}
        {vaultStatus === 'locked' && <UnlockPage />}
        {vaultStatus === 'unlocked' && <UnlockedApp />}
      </MotionConfig>
    </QueryClientProvider>
  );
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
