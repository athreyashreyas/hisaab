import { cn } from '../../lib/cn';

/**
 * Conic progress ring, used for goals (see mockup .ring). SVG-based so it strokes
 * cleanly at any size and can animate the arc. `progress` is 0..1.
 */
export function ProgressRing({
  progress,
  size = 46,
  stroke = 5,
  color = 'var(--teal-500)',
  track = 'var(--parchment-300)',
  label,
  className,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: React.ReactNode;
  className?: string;
}) {
  const p = Math.max(0, Math.min(1, progress));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      {label != null && (
        <span className="absolute text-[11px] font-semibold tabular-nums" style={{ color }}>
          {label}
        </span>
      )}
    </div>
  );
}
