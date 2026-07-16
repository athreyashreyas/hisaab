import { cn } from '../../lib/cn';

/** Parchment shimmer placeholder. Respects reduced-motion via the pulse class. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-card bg-parchment-200', className)} />;
}
