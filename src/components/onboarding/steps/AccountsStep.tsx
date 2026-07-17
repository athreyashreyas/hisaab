import { useState } from 'react';
import { Wallet, Landmark, CreditCard, Smartphone, Check } from 'lucide-react';
import { OnboardingScaffold } from '../OnboardingScaffold';
import { PrimaryButton, QuietLink, StepHeading } from '../ui';
import { ACCENT_PALETTE } from '../../../lib/categories';
import type { AccountKind } from '../../../types';
import { cn } from '../../../lib/cn';

export interface DraftAccount {
  name: string;
  kind: AccountKind;
  color: string;
}

// Cash is seeded already; these are the common extras to toggle on. Names are
// sensible defaults the user renames later in Settings → Accounts.
const SUGGESTED: { name: string; kind: AccountKind; icon: typeof Wallet; color: string }[] = [
  { name: 'Bank', kind: 'bank', icon: Landmark, color: ACCENT_PALETTE[1] },
  { name: 'Credit card', kind: 'card', icon: CreditCard, color: ACCENT_PALETTE[2] },
  { name: 'UPI / Wallet', kind: 'wallet', icon: Smartphone, color: ACCENT_PALETTE[3] },
];

/**
 * Choose the accounts you keep (mirrors Harmony's tap-to-toggle areas step).
 * Cash is already set up; toggle any extras and they're created on continue.
 */
export function AccountsStep({
  stepIndex,
  totalSteps,
  onBack,
  onContinue,
}: {
  stepIndex: number;
  totalSteps: number;
  onBack: () => void;
  onContinue: (drafts: DraftAccount[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const toggle = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  async function submit() {
    setBusy(true);
    const drafts: DraftAccount[] = SUGGESTED.filter((s) => selected.has(s.name)).map((s) => ({
      name: s.name,
      kind: s.kind,
      color: s.color,
    }));
    await onContinue(drafts);
  }

  return (
    <OnboardingScaffold
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      onBack={onBack}
      footer={
        <div className="space-y-3">
          <PrimaryButton onClick={submit} disabled={busy}>
            {busy ? 'Setting up…' : selected.size > 0 ? `Add ${selected.size} and continue` : 'Continue'}
          </PrimaryButton>
          {selected.size === 0 && (
            <div className="text-center">
              <QuietLink onClick={submit}>Just Cash for now</QuietLink>
            </div>
          )}
        </div>
      }
    >
      <StepHeading eyebrow="Your money" title="Which accounts do you keep?">
        Pick the ones you use and Hisaab tracks a balance for each. You can rename them or add more
        any time in Settings.
      </StepHeading>

      <div className="mt-6 space-y-2.5">
        <div className="flex items-center gap-3 rounded-card border border-teal-100 bg-teal-50 px-4 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-card bg-teal-100 text-teal-700">
            <Wallet size={19} />
          </span>
          <div className="flex-1">
            <div className="text-[14.5px] font-semibold text-ink-900">Cash</div>
            <div className="text-[12px] text-ink-500">Already set up for you</div>
          </div>
          <Check size={18} className="text-teal-600" />
        </div>

        {SUGGESTED.map(({ name, icon: Ic, color }) => {
          const active = selected.has(name);
          return (
            <button
              key={name}
              onClick={() => toggle(name)}
              className={cn(
                'flex w-full items-center gap-3 rounded-card border px-4 py-3 text-left transition-colors',
                active ? 'border-teal-400 bg-teal-50' : 'border-parchment-300 bg-parchment-50 hover:bg-parchment-100'
              )}
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-card"
                style={{ backgroundColor: `${color}22`, color }}
              >
                <Ic size={19} />
              </span>
              <div className="flex-1">
                <div className="text-[14.5px] font-semibold text-ink-900">{name}</div>
                <div className="text-[12px] capitalize text-ink-500">{name === 'UPI / Wallet' ? 'wallet' : name.toLowerCase()}</div>
              </div>
              <span
                className={cn(
                  'grid h-6 w-6 place-items-center rounded-full border-2 transition-colors',
                  active ? 'border-teal-500 bg-teal-500 text-white' : 'border-parchment-300'
                )}
              >
                {active && <Check size={14} />}
              </span>
            </button>
          );
        })}
      </div>
    </OnboardingScaffold>
  );
}
