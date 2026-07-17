import { useState } from 'react';
import { Copy, Check, KeyRound } from 'lucide-react';
import { OnboardingScaffold } from '../OnboardingScaffold';
import { PrimaryButton, StepHeading } from '../ui';

/**
 * Reveal the one-time Recovery Key exactly once, with an explicit "I've saved it"
 * confirm. It's the only way back into the cloud backup if the passphrase is
 * ever forgotten (the server can't help — it can't decrypt).
 */
export function RecoveryStep({
  stepIndex,
  totalSteps,
  recoveryKey,
  onNext,
}: {
  stepIndex: number;
  totalSteps: number;
  recoveryKey: string | null;
  onNext: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  async function copy() {
    if (!recoveryKey) return;
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard may be unavailable; the key is on screen to copy by hand
    }
  }

  return (
    <OnboardingScaffold
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      footer={
        <PrimaryButton onClick={onNext} disabled={!saved}>
          I've saved my Recovery Key
        </PrimaryButton>
      }
    >
      <StepHeading eyebrow="Recovery" title="Your Recovery Key">
        Write this down and keep it somewhere safe and offline. It's the only way back into your
        cloud backup if you ever forget your passphrase — we can't recover it for you.
      </StepHeading>

      <div className="my-5 rounded-card border border-teal-100 bg-teal-50 p-4">
        <div className="flex items-center gap-2 text-teal-700">
          <KeyRound size={16} />
          <span className="text-[11px] font-semibold uppercase tracking-wide">Recovery Key</span>
        </div>
        <div className="mt-2 text-center font-mono text-lg font-semibold tracking-wide text-teal-700">
          {recoveryKey ?? '—'}
        </div>
      </div>

      <button
        onClick={copy}
        className="flex w-full items-center justify-center gap-2 rounded-card bg-parchment-200 py-2.5 text-sm font-semibold text-ink-700 hover:bg-parchment-300"
      >
        {copied ? <Check size={17} /> : <Copy size={17} />}
        {copied ? 'Copied' : 'Copy key'}
      </button>

      <label className="mt-5 flex items-start gap-2.5 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="mt-0.5 rounded border-parchment-300 text-teal-500 focus:ring-teal-400"
        />
        <span>I've saved my Recovery Key somewhere safe and offline.</span>
      </label>
    </OnboardingScaffold>
  );
}
