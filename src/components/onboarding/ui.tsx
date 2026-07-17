import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

/** Shared onboarding controls (ported from Harmony, teal), so every step reads the same. */

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-full bg-teal-500 py-3.5 text-sm font-semibold text-white transition-opacity hover:bg-teal-600 disabled:opacity-40"
    >
      {children}
    </motion.button>
  );
}

export function QuietLink({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-ink-500 underline-offset-2 hover:text-teal-600 hover:underline"
    >
      {children}
    </button>
  );
}

/** The eyebrow + serif headline + supporting line that opens most steps. */
export function StepHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="pt-6">
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-600">{eyebrow}</p>
      )}
      <h1 className="mt-2 font-serif text-3xl leading-tight text-ink-900">{title}</h1>
      {children && <p className="mt-3 text-[15px] leading-relaxed text-ink-500">{children}</p>}
    </div>
  );
}
