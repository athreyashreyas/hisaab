import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { OnboardingScaffold } from '../OnboardingScaffold';
import { PrimaryButton, QuietLink, StepHeading } from '../ui';
import { Input } from '../../ui/Input';
import { useAccountStore, WrongPasswordError } from '../../../stores/accountStore';

/**
 * The one account step: email + a single password that both signs you in and
 * unlocks your encrypted ledger. New here → create an account (which mints the
 * vault and a recovery phrase). Returning on a new device → sign in and your
 * ledger is restored.
 */
export function CreateAccountStep({
  stepIndex,
  totalSteps,
  onBack,
  onRegistered,
  onSignedIn,
  onForgot,
}: {
  stepIndex: number;
  totalSteps: number;
  onBack: () => void;
  onRegistered: () => void;
  onSignedIn: () => void;
  onForgot: (email: string) => void;
}) {
  const register = useAccountStore((s) => s.register);
  const signIn = useAccountStore((s) => s.signIn);

  const [mode, setMode] = useState<'up' | 'in'>('up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const emailOk = /.+@.+\..+/.test(email);
  const canSubmit =
    emailOk && password.length >= 8 && (mode === 'in' || confirm === password) && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'up') {
        await register(email, password);
        onRegistered();
      } else {
        await signIn(email, password);
        onSignedIn();
      }
    } catch (err) {
      setError(
        err instanceof WrongPasswordError
          ? 'That email or password is incorrect.'
          : err instanceof Error
            ? err.message
            : 'Something went wrong. Try again.'
      );
      setBusy(false);
    }
  }

  return (
    <OnboardingScaffold
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      onBack={onBack}
      footer={
        <div className="space-y-3">
          <PrimaryButton onClick={submit} disabled={!canSubmit}>
            {busy
              ? mode === 'up'
                ? 'Creating your account…'
                : 'Signing in…'
              : mode === 'up'
                ? 'Create account'
                : 'Sign in'}
          </PrimaryButton>
          <div className="text-center">
            <QuietLink
              onClick={() => {
                setMode(mode === 'up' ? 'in' : 'up');
                setError(null);
              }}
            >
              {mode === 'up' ? 'I already have an account' : 'Create a new account instead'}
            </QuietLink>
          </div>
        </div>
      }
    >
      <StepHeading
        eyebrow="Your account"
        title={mode === 'up' ? 'Create your account' : 'Welcome back'}
      >
        {mode === 'up'
          ? 'One email and password. It signs you in and unlocks your ledger, which stays encrypted so only you can read it.'
          : 'Sign in and your encrypted ledger is restored to this device.'}
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
          placeholder={mode === 'up' ? 'At least 8 characters' : 'Your password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={mode === 'in' ? error ?? undefined : undefined}
        />
        {mode === 'up' && (
          <Input
            type="password"
            label="Confirm password"
            autoComplete="new-password"
            placeholder="Re-enter it"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={confirm && confirm !== password ? "Those don't match." : error ?? undefined}
          />
        )}
      </div>

      {mode === 'in' && (
        <div className="mt-3 text-right">
          <QuietLink onClick={() => onForgot(email)}>Forgot password?</QuietLink>
        </div>
      )}

      <div className="mt-6 flex items-start gap-2.5 rounded-card bg-teal-50 px-4 py-3 text-[13px] leading-relaxed text-teal-700">
        <ShieldCheck size={18} className="mt-0.5 shrink-0" />
        <span>
          End to end encrypted. We derive your login separately from your key, so the server can
          verify you but never read your data.
        </span>
      </div>
    </OnboardingScaffold>
  );
}
