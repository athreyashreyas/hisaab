import { Plus, Wallet, Target } from 'lucide-react';
import { OnboardingScaffold } from '../OnboardingScaffold';
import { PrimaryButton } from '../ui';

/** Final step: a warm summary and the hand-off into the guide walk-through. */
export function ReadyStep({
  stepIndex,
  totalSteps,
  onFinish,
}: {
  stepIndex: number;
  totalSteps: number;
  onFinish: () => void;
}) {
  return (
    <OnboardingScaffold
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      showProgress={false}
      footer={<PrimaryButton onClick={onFinish}>Show me around</PrimaryButton>}
    >
      <div className="flex min-h-full flex-col justify-center py-14">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-teal-50 text-teal-500">
          <Wallet size={26} />
        </div>
        <h1 className="mt-6 font-serif text-4xl leading-tight text-ink-900">You're all set.</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-500">
          Your vault is ready and your ledger is private. Here's the shape of it:
        </p>

        <ul className="mt-6 space-y-3">
          <Hint icon={<Plus size={17} />} text="Tap the teal + to log an expense or income." />
          <Hint icon={<Wallet size={17} />} text="Watch your safe-to-spend on Home update as you go." />
          <Hint icon={<Target size={17} />} text="Set a goal worth saving for in Goals." />
        </ul>

        <p className="mt-6 text-sm leading-relaxed text-ink-300">
          Next is a quick tour of how Hisaab works. You can reopen it any time from Settings.
        </p>
      </div>
    </OnboardingScaffold>
  );
}

function Hint({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-card bg-teal-50 text-teal-600">
        {icon}
      </span>
      <span className="text-[15px] text-ink-700">{text}</span>
    </li>
  );
}
