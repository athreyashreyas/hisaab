import { useState } from 'react';
import { CloudOff, Check } from 'lucide-react';
import { OnboardingScaffold } from '../OnboardingScaffold';
import { PrimaryButton, QuietLink, StepHeading } from '../ui';
import { Input } from '../../ui/Input';
import { useAuthStore } from '../../../stores/authStore';

/**
 * Email-based registration, as a first-class onboarding step. Create an account
 * (or sign in) to back up across devices — or skip and stay on this device only.
 * Auth identity is separate from the vault passphrase: this says *who you are*
 * for the encrypted backup; the passphrase (next) is what decrypts your data.
 */
export function BackupStep({
  stepIndex,
  totalSteps,
  onBack,
  onNext,
}: {
  stepIndex: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const { user, signUpWithEmail, signInWithEmail } = useAuthStore();
  const [mode, setMode] = useState<'up' | 'in'>('up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const canSubmit = /.+@.+\..+/.test(email) && password.length >= 8 && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'up') {
        await signUpWithEmail(email.trim(), password);
        // If email confirmation is on, there's no session yet — the account is
        // made, the backup just switches on after they confirm. The local vault
        // works regardless, so we let them carry on.
        if (!useAuthStore.getState().user) {
          setConfirmSent(true);
          setBusy(false);
          return;
        }
      } else {
        await signInWithEmail(email.trim(), password);
      }
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setBusy(false);
    }
  }

  // Already signed in (e.g. returning to this step): show a calm confirmation.
  if (user) {
    return (
      <OnboardingScaffold
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        onBack={onBack}
        footer={<PrimaryButton onClick={onNext}>Continue</PrimaryButton>}
      >
        <StepHeading eyebrow="Backup" title="You're signed in">
          Backing up as {user.email}. Your ledger will sync across your devices, encrypted the whole
          way.
        </StepHeading>
        <div className="mt-6 flex items-center gap-2 rounded-card bg-moss-100 px-4 py-3 text-sm font-medium text-moss-600">
          <Check size={18} /> Encrypted backup is on.
        </div>
      </OnboardingScaffold>
    );
  }

  if (confirmSent) {
    return (
      <OnboardingScaffold
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        onBack={onBack}
        footer={<PrimaryButton onClick={onNext}>Continue setup</PrimaryButton>}
      >
        <StepHeading eyebrow="Almost there" title="Check your email">
          We sent a confirmation link to {email}. Confirm it whenever you like — your backup switches
          on then. You can keep setting up now; everything works on this device meanwhile.
        </StepHeading>
      </OnboardingScaffold>
    );
  }

  return (
    <OnboardingScaffold
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      onBack={onBack}
      footer={
        <div className="space-y-3">
          <PrimaryButton onClick={submit} disabled={!canSubmit}>
            {busy ? 'Please wait…' : mode === 'up' ? 'Create account' : 'Sign in'}
          </PrimaryButton>
          <div className="flex items-center justify-center gap-1 text-sm text-ink-500">
            <QuietLink onClick={() => setMode(mode === 'up' ? 'in' : 'up')}>
              {mode === 'up' ? 'I already have an account' : 'Create an account instead'}
            </QuietLink>
          </div>
          <button
            onClick={onNext}
            className="mx-auto flex items-center gap-1.5 py-1 text-sm font-medium text-ink-300 hover:text-ink-500"
          >
            <CloudOff size={15} /> Just this device for now
          </button>
        </div>
      }
    >
      <StepHeading eyebrow="Backup" title="Back up across your devices?">
        Create an account to keep an encrypted backup and sync between your phone and laptop. It's
        optional — Hisaab works fully offline without it, and you can turn it on later.
      </StepHeading>

      <div className="mt-6 space-y-4">
        <Input
          type="email"
          label="Email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          label="Password"
          autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
        />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink-300">
        This sign-in only names your backup. It never sees your passphrase or your data — the server
        holds sealed, unreadable blobs.
      </p>
    </OnboardingScaffold>
  );
}
