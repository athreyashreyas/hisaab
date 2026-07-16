import { useEffect, useRef, useState } from 'react';
import { liveQuery } from 'dexie';

/**
 * Minimal live-query hook over Dexie's `liveQuery` observable (we don't pull in
 * dexie-react-hooks). Re-runs `querier` whenever any table it touched changes,
 * so screens re-render the moment a write lands — the local-first payoff.
 *
 * `deps` behaves like a dependency array: change it to re-subscribe with a new
 * querier closure (e.g. a different month or filter).
 */
export function useLiveQuery<T>(
  querier: () => T | Promise<T>,
  deps: unknown[] = [],
  initial?: T
): T | undefined {
  const [value, setValue] = useState<T | undefined>(initial);
  const querierRef = useRef(querier);
  querierRef.current = querier;

  useEffect(() => {
    const sub = liveQuery(() => querierRef.current()).subscribe({
      next: (v) => setValue(v),
      error: (err) => console.error('[useLiveQuery]', err),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}
