import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { OnboardingScaffold } from '../OnboardingScaffold';
import { PrimaryButton, StepHeading } from '../ui';
import { Input } from '../../ui/Input';

/**
 * Choose the passphrase that locks the vault. On continue the parent mints the
 * vault (createVault → seeds defaults → unlocks), then moves to the Recovery Key.
 */
export function PassphraseStep({
  stepIndex,
  totalSteps,
  onBack,
  onCreate,
}: {
  stepIndex: number;
  totalSteps: number;
  onBack: () => void;
  onCreate: (passphrase: string) => Promise<void>;
}) {
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tooShort = passphrase.length > 0 && passphrase.length < 8;
  const mismatch = confirm.length > 0 && confirm !== passphrase;
  const canSubmit = passphrase.length >= 8 && confirm === passphrase && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate(passphrase);
    } catch {
      setError('Could not create your vault. Please try again.');
      setBusy(false);
    }
  }

  return (
    <OnboardingScaffold
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      onBack={onBack}
      footer={
        <PrimaryButton onClick={submit} disabled={!canSubmit}>
          {busy ? 'Creating your vault…' : 'Create vault'}
        </PrimaryButton>
      }
    >
      <StepHeading eyebrow="Your vault" title="Choose a passphrase">
        This locks your ledger. It encrypts everything before it's backed up, so only you can read
        it. Pick something memorable, because we can't reset it.
      </StepHeading>

      <div className="mt-6 space-y-4">
        <Input
          type="password"
          label="Passphrase"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          error={tooShort ? 'Use at least 8 characters.' : undefined}
          hint={!tooShort ? 'A memorable phrase beats a short password.' : undefined}
        />
        <Input
          type="password"
          label="Confirm passphrase"
          autoComplete="new-password"
          placeholder="Re-enter it"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? "Those don't match." : error ?? undefined}
        />
      </div>

      <div className="mt-6 flex items-start gap-2.5 rounded-card bg-teal-50 px-4 py-3 text-[13px] leading-relaxed text-teal-700">
        <ShieldCheck size={18} className="mt-0.5 shrink-0" />
        <span>End-to-end encrypted. The server only ever holds sealed, unreadable blobs.</span>
      </div>
    </OnboardingScaffold>
  );
}
