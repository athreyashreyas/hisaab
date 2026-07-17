import { useState } from 'react';
import { Copy, Check, KeyRound } from 'lucide-react';
import { OnboardingScaffold } from '../OnboardingScaffold';
import { PrimaryButton, StepHeading } from '../ui';

/**
 * Reveal the recovery phrase exactly once, with an explicit "I've saved it"
 * confirm. It is the only way to reset your password without losing your data:
 * it independently unlocks the same encrypted ledger. The server never sees it.
 */
export function RecoveryStep({
  stepIndex,
  totalSteps,
  recoveryPhrase,
  onNext,
}: {
  stepIndex: number;
  totalSteps: number;
  recoveryPhrase: string | null;
  onNext: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const words = (recoveryPhrase ?? '').split(' ').filter(Boolean);

  async function copy() {
    if (!recoveryPhrase) return;
    try {
      await navigator.clipboard.writeText(recoveryPhrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard may be unavailable; the phrase is on screen to copy by hand
    }
  }

  return (
    <OnboardingScaffold
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      footer={
        <PrimaryButton onClick={onNext} disabled={!saved}>
          I've saved my recovery phrase
        </PrimaryButton>
      }
    >
      <StepHeading eyebrow="Recovery" title="Your recovery phrase">
        Write these twelve words down and keep them somewhere safe and offline. If you ever need to
        reset your password, this phrase is what restores your encrypted ledger. We cannot recover it
        for you.
      </StepHeading>

      <div className="my-5 rounded-card border border-teal-100 bg-teal-50 p-4">
        <div className="mb-3 flex items-center gap-2 text-teal-700">
          <KeyRound size={16} />
          <span className="text-[11px] font-semibold uppercase tracking-wide">Recovery phrase</span>
        </div>
        <ol className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {words.map((w, i) => (
            <li key={i} className="flex items-baseline gap-2 font-mono text-sm text-teal-800">
              <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-teal-400">
                {i + 1}
              </span>
              <span className="font-semibold">{w}</span>
            </li>
          ))}
        </ol>
      </div>

      <button
        onClick={copy}
        className="flex w-full items-center justify-center gap-2 rounded-card bg-parchment-200 py-2.5 text-sm font-semibold text-ink-700 hover:bg-parchment-300"
      >
        {copied ? <Check size={17} /> : <Copy size={17} />}
        {copied ? 'Copied' : 'Copy phrase'}
      </button>

      <label className="mt-5 flex items-start gap-2.5 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="mt-0.5 rounded border-parchment-300 text-teal-500 focus:ring-teal-400"
        />
        <span>I've saved my recovery phrase somewhere safe and offline.</span>
      </label>
    </OnboardingScaffold>
  );
}
