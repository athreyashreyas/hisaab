import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { router } from './router';
import { useAccountStore } from './stores/accountStore';
import { useSyncQueue } from './hooks/useSyncQueue';
import { backfillNewDefaultCategories } from './lib/repo';
import { OnboardingFlow } from './pages/onboarding/OnboardingFlow';
import { UnlockScreen } from './pages/auth/UnlockScreen';
import { SignInScreen } from './pages/auth/SignInScreen';
import { ResetPasswordScreen } from './pages/auth/ResetPasswordScreen';

/**
 * Boot + account gate. One email + password is the whole identity: it signs you
 * in and unlocks your encrypted ledger. The router (the app proper) mounts only
 * once the vault is unlocked. MotionConfig honours the OS reduced-motion setting.
 *
 * Gate order matters: a password-reset session ('recovery') wins over everything
 * so a reset link always reaches the reset screen.
 */
export default function App() {
  const status = useAccountStore((s) => s.status);
  const init = useAccountStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">{renderGate()}</MotionConfig>
    </QueryClientProvider>
  );

  function renderGate() {
    switch (status) {
      case 'checking':
        return <BootSplash />;
      case 'recovery':
        return <ResetPasswordScreen />;
      case 'onboarding':
        return <OnboardingFlow />;
      case 'signed-out':
        return <SignInScreen />;
      case 'locked':
        return <UnlockScreen />;
      case 'unlocked':
        return <UnlockedApp />;
      default:
        return <BootSplash />;
    }
  }
}

/** Everything behind the vault: sync wiring + the routed shell. */
function UnlockedApp() {
  useSyncQueue();
  // Backfill defaults added in newer versions (e.g. Education & learning), once,
  // locally — so they show up without a manual sync or "restore defaults".
  useEffect(() => {
    void backfillNewDefaultCategories();
  }, []);
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
