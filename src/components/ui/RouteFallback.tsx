/**
 * The quiet placeholder shown while a code-split screen streams in. Deliberately
 * minimal — a centered pulsing dot in the brand tint — so a fast chunk load reads
 * as an instant transition rather than a flash of layout.
 */
export function RouteFallback() {
  return (
    <div className="grid h-full w-full place-items-center">
      <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse-dot" />
    </div>
  );
}
