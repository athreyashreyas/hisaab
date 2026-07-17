import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useVaultStore } from '../../stores/vaultStore';
import { keyring } from '../../lib/crypto';
import { isCloudConfigured } from '../../lib/supabase';
import { createAccount } from '../../lib/repo';
import { APP_VERSION } from '../../lib/changelog';
import { setSeenVersionLocal } from '../../lib/whatsNew';
import { PENDING_GUIDE_KEY } from '../../lib/guideRoute';
import { WelcomeStep } from '../../components/onboarding/steps/WelcomeStep';
import { BackupStep } from '../../components/onboarding/steps/BackupStep';
import { PassphraseStep } from '../../components/onboarding/steps/PassphraseStep';
import { RecoveryStep } from '../../components/onboarding/steps/RecoveryStep';
import { AccountsStep, type DraftAccount } from '../../components/onboarding/steps/AccountsStep';
import { ReadyStep } from '../../components/onboarding/steps/ReadyStep';

/**
 * Hisaab's guided first-run, in the spirit of Harmony's onboarding. A fresh
 * account is walked, one calm step at a time, through: what Hisaab is → optional
 * email backup → choosing a passphrase (which mints the vault) → saving the
 * Recovery Key → adding the accounts they keep → done. On finish it marks the
 * account onboarded, remembers this version as seen (so What's-new doesn't greet
 * someone who just saw the full guide), and lands them on the guide.
 *
 * Reload-safety: if the vault was already created in a prior, interrupted run
 * but the keyring is locked (a refresh cleared the in-memory key), we don't
 * re-run setup — we mark onboarded and let the normal gate show Unlock.
 */
type Step = 'welcome' | 'backup' | 'passphrase' | 'recovery' | 'accounts' | 'ready';

export function OnboardingFlow() {
  const setup = useVaultStore((s) => s.setup);
  const wrapped = useVaultStore((s) => s.wrapped);
  const pendingRecoveryKey = useVaultStore((s) => s.pendingRecoveryKey);
  const clearPendingRecoveryKey = useVaultStore((s) => s.clearPendingRecoveryKey);
  const markOnboarded = useVaultStore((s) => s.markOnboarded);

  // The visible step order, omitting the backup step when there is no cloud.
  const steps = useMemo<Step[]>(
    () =>
      (isCloudConfigured()
        ? ['welcome', 'backup', 'passphrase', 'recovery', 'accounts', 'ready']
        : ['welcome', 'passphrase', 'recovery', 'accounts', 'ready']),
    []
  );

  const [step, setStep] = useState<Step>('welcome');
  const [direction, setDirection] = useState(1);
  const bailed = useRef(false);

  // Reload guard: a vault already exists but we're locked → finish onboarding
  // silently and hand off to the Unlock screen rather than re-minting a vault.
  useEffect(() => {
    if (bailed.current) return;
    if (wrapped && !keyring.isUnlocked()) {
      bailed.current = true;
      setSeenVersionLocal(APP_VERSION);
      markOnboarded();
    }
  }, [wrapped, markOnboarded]);

  const index = steps.indexOf(step);
  function go(to: Step) {
    setDirection(steps.indexOf(to) >= index ? 1 : -1);
    setStep(to);
  }
  const next = () => go(steps[Math.min(index + 1, steps.length - 1)]);
  const back = () => go(steps[Math.max(index - 1, 0)]);

  async function createVaultWith(passphrase: string) {
    await setup(passphrase); // mints vault, seeds defaults (incl. Cash), unlocks
    next(); // → recovery
  }

  async function createAccountsAnd(drafts: DraftAccount[]) {
    for (const d of drafts) {
      await createAccount({ name: d.name, kind: d.kind, opening_balance: 0, color: d.color });
    }
    next(); // → ready
  }

  function finish() {
    setSeenVersionLocal(APP_VERSION);
    try {
      localStorage.setItem(PENDING_GUIDE_KEY, '1'); // land on the guide once the app mounts
    } catch {
      // ignore
    }
    markOnboarded(); // flips the gate → the app mounts
  }

  const common = { stepIndex: index, totalSteps: steps.length };

  return (
    <div className="h-full overflow-hidden">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: direction * 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="h-full"
      >
        {step === 'welcome' && <WelcomeStep {...common} onNext={next} />}
        {step === 'backup' && <BackupStep {...common} onBack={back} onNext={next} />}
        {step === 'passphrase' && (
          <PassphraseStep {...common} onBack={back} onCreate={createVaultWith} />
        )}
        {step === 'recovery' && (
          <RecoveryStep
            {...common}
            recoveryKey={pendingRecoveryKey}
            onNext={() => {
              clearPendingRecoveryKey();
              next();
            }}
          />
        )}
        {step === 'accounts' && (
          <AccountsStep {...common} onBack={back} onContinue={createAccountsAnd} />
        )}
        {step === 'ready' && <ReadyStep {...common} onFinish={finish} />}
      </motion.div>
    </div>
  );
}
