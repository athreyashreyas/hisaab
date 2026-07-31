/**
 * The shape every "add or edit" surface in the app uses for its open state.
 *
 * A single piece of state answers both questions a form modal has — is it open,
 * and is it editing something — with no way to hold a contradictory pair:
 *
 *   null    closed
 *   'new'   open, creating
 *   T       open, editing that row
 *
 * The accounts, categories and investments screens each spelled the same
 * `target !== 'new' && target !== null` narrowing out by hand, which is easy to
 * get subtly wrong and reads as noise at the top of every modal.
 */
export type EditorTarget<T> = T | 'new' | null;

export interface ResolvedEditor<T> {
  open: boolean;
  /** The row being edited, or null when creating. */
  existing: T | null;
}

export function resolveEditor<T>(target: EditorTarget<T>): ResolvedEditor<T> {
  return {
    open: target !== null,
    existing: target === null || target === 'new' ? null : target,
  };
}
