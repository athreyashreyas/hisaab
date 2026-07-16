import { cn } from '../../lib/cn';

type Tone = 'ok' | 'watch' | 'over' | 'neutral' | 'teal';

const tones: Record<Tone, string> = {
  ok: 'bg-moss-100 text-moss-600',
  watch: 'bg-amber-100 text-amber-600',
  over: 'bg-rose-100 text-rose-600',
  neutral: 'bg-parchment-200 text-ink-500',
  teal: 'bg-teal-100 text-teal-700',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
