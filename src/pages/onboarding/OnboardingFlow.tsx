import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAccountStore } from '../../stores/accountStore';
import { createAccount } from '../../lib/repo';
import { APP_VERSION } from '../../lib/changelog';
import { setSeenVersionLocal, setSeenVersionSynced } from '../../lib/whatsNew';
import { PENDING_GUIDE_KEY } from '../../lib/guideRoute';
import { WelcomeStep } from '../../components/onboarding/steps/WelcomeStep';
import { CreateAccountStep } from '../../components/onboarding/steps/CreateAccountStep';
import { RecoveryStep } from '../../components/onboarding/steps/RecoveryStep';
import { AccountsStep, type DraftAccount } from '../../components/onboarding/steps/AccountsStep';
import { ReadyStep } from '../../components/onboarding/steps/ReadyStep';
import { ForgotPasswordScreen } from '../auth/ForgotPasswordScreen';

/**
 * Guided first-run for a fresh account: what Hisaab is → create your account
 * (email + one password) → save your recovery phrase → add the accounts you keep
 * → done. A returning user on a new device can sign in from the account step,
 * which skips straight into the app with their ledger restored.
 *
 * register() mints the vault mid-flow (status becomes unlocked), but the gate
 * keys on onboardedAt, so we stay here until finish().
 */
type Step = 'welcome' | 'account' | 'recovery' | 'accounts' | 'ready';

export function OnboardingFlow() {
  const pendingRecoveryPhrase = useAccountStore((s) => s.pendingRecoveryPhrase);
  const clearPendingRecoveryPhrase = useAccountStore((s) => s.clearPendingRecoveryPhrase);
  const markOnboarded = useAccountStore((s) => s.markOnboarded);

  const steps = useMemo<Step[]>(() => ['welcome', 'account', 'recovery', 'accounts', 'ready'], []);
  const [step, setStep] = useState<Step>('welcome');
  const [direction, setDirection] = useState(1);
  const [forgotEmail, setForgotEmail] = useState<string | null>(null);

  const index = steps.indexOf(step);
  function go(to: Step) {
    setDirection(steps.indexOf(to) >= index ? 1 : -1);
    setStep(to);
  }

  async function createAccountsAnd(drafts: DraftAccount[]) {
    for (const d of drafts) {
      await createAccount({ name: d.name, kind: d.kind, opening_balance: 0, color: d.color });
    }
    go('ready');
  }

  function finish() {
    // Someone who just finished setup has been walked through the app already,
    // so mark this version seen on both markers: What's new should never greet
    // them the moment they land, on this device or the next one they sign in on.
    setSeenVersionLocal(APP_VERSION);
    void setSeenVersionSynced(APP_VERSION);
    try {
      localStorage.setItem(PENDING_GUIDE_KEY, '1'); // land on the guide once the app mounts
    } catch {
      // ignore
    }
    markOnboarded(); // flips the gate → the app mounts
  }

  if (forgotEmail !== null) {
    return <ForgotPasswordScreen initialEmail={forgotEmail} onBack={() => setForgotEmail(null)} />;
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
        {step === 'welcome' && <WelcomeStep {...common} onNext={() => go('account')} />}
        {step === 'account' && (
          <CreateAccountStep
            {...common}
            onBack={() => go('welcome')}
            onRegistered={() => go('recovery')}
            onSignedIn={finish} // existing account restored → straight into the app
            onForgot={(email) => setForgotEmail(email)}
          />
        )}
        {step === 'recovery' && (
          <RecoveryStep
            {...common}
            recoveryPhrase={pendingRecoveryPhrase}
            onNext={() => {
              clearPendingRecoveryPhrase();
              go('accounts');
            }}
          />
        )}
        {step === 'accounts' && (
          <AccountsStep {...common} onBack={() => go('recovery')} onContinue={createAccountsAnd} />
        )}
        {step === 'ready' && <ReadyStep {...common} onFinish={finish} />}
      </motion.div>
    </div>
  );
}
