import { OnboardingScaffold } from '../OnboardingScaffold';
import { PrimaryButton } from '../ui';

/** Screen 1. The one screen where the copy is allowed to lean a little warm. */
export function WelcomeStep({
  stepIndex,
  totalSteps,
  onNext,
}: {
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
}) {
  return (
    <OnboardingScaffold
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      showProgress={false}
      footer={<PrimaryButton onClick={onNext}>Begin</PrimaryButton>}
    >
      <div className="flex min-h-full flex-col justify-center py-16">
        <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-teal-500 font-serif text-3xl text-white shadow-lg">
          ₹
        </div>
        <span className="mt-6 font-serif text-2xl text-teal-600">Hisaab</span>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-ink-900">
          An honest reckoning of where your money goes.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-500">
          Log a spend in a couple of taps. See one clear number for what's safe to spend. All on your
          device, all encrypted before it's ever backed up. Let's set you up.
        </p>
      </div>
    </OnboardingScaffold>
  );
}
