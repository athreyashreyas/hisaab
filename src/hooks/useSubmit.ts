import { useCallback, useRef, useState } from 'react';

/**
 * One-at-a-time submit guard for the save buttons on sheets and modals.
 *
 * Every write in the app is async (Dexie put + a sync_queue enqueue), and a
 * button left enabled across that await books the entry twice on a double-tap.
 * Wrapping the handler here closes the window and gives the button something to
 * disable on.
 *
 * The in-flight flag lives in a ref, not just state: `setPending(true)` doesn't
 * update `pending` until the next render, so two handlers dispatched before that
 * render would both read the old value and both pass. The ref flips
 * synchronously, so the second call always sees it. The state mirror exists only
 * so the button can re-render as disabled.
 *
 *   const { pending, submit } = useSubmit();
 *   <Button disabled={!canSave || pending} onClick={() => submit(save)} />
 */
export function useSubmit() {
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  const submit = useCallback(async (action: () => void | Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      await action();
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, []);

  return { pending, submit };
}
