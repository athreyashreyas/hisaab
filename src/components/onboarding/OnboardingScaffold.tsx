import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { ProgressDots } from '../guide/ProgressDots';

/**
 * Common chrome for every onboarding screen (ported from Harmony): a top row
 * with an optional back button and progress dots, a single scrolling content
 * region that makes room for the keyboard, and a fixed footer above the home
 * indicator.
 */
export function OnboardingScaffold({
  stepIndex,
  totalSteps,
  showProgress = true,
  onBack,
  children,
  footer,
}: {
  stepIndex: number;
  totalSteps: number;
  showProgress?: boolean;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-parchment-100">
      <header className="relative z-10 flex items-center justify-between px-5 pt-safe">
        <div className="flex h-12 items-center">
          {onBack ? (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="-ml-2 rounded-full p-2 text-ink-500 hover:text-ink-700"
            >
              <ChevronLeft size={22} />
            </button>
          ) : null}
        </div>
        <div className="flex h-12 items-center">
          {showProgress && <ProgressDots total={totalSteps} current={stepIndex} />}
        </div>
      </header>

      <main
        className="scroll-ios relative z-10 min-h-0 flex-1 overflow-y-auto px-5"
        style={{ paddingBottom: 'var(--keyboard-height, 0px)' }}
      >
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>

      {footer && (
        <footer className="relative z-10 px-5 pb-safe pt-4">
          <div className="mx-auto w-full max-w-md pb-4">{footer}</div>
        </footer>
      )}
    </div>
  );
}
