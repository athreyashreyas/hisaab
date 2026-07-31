/**
 * What goals have claimed, and out of which pot.
 *
 * A goal contribution earmarks money out of an account balance or out of a
 * holding's value, so the same rupee is never counted as both free and saved.
 * Four different figures depend on that rule — a per-account balance, the total
 * reserved out of accounts, the per-holding earmark, and net worth's "free" —
 * and when they disagree the arithmetic on screen stops adding up.
 *
 * So the rule is stated once, here, as one pure pass over the contributions, and
 * every hook reads its answer off the same object. The subtlety that made this
 * worth extracting: a contribution only reserves anything when *both* its goal
 * and its source still count. A deleted goal releases its money (that is what
 * makes deleting a goal give the money back), and so does a source that has left
 * the picture. Deleting a mutual fund that was funding a goal used to take its
 * value out of what you hold while leaving the goal's claim on it standing, so
 * "free to use" quietly dropped by the earmark and never recovered.
 */
import type { GoalContribution, ID } from '../types';

export interface Earmarks {
  /** Goal money held out of each account, by account id. Never negative. */
  byAccount: Map<ID, number>;
  /** Goal money held inside each holding, by investment id. Never negative. */
  byInvestment: Map<ID, number>;
  /** Total held out of accounts. */
  fromAccounts: number;
  /** Total held inside holdings. */
  fromInvestments: number;
  /** Everything goals have claimed, wherever it sits. */
  total: number;
}

/**
 * Roll live contributions into per-source earmarks.
 *
 * `liveGoalIds` / `liveAccountIds` / `liveInvestmentIds` are the sets each figure
 * is measured against, and callers must pass exactly the sets their totals are
 * built from: net worth counts active accounts and unarchived holdings, so those
 * are the ones allowed to carry a claim.
 */
export function computeEarmarks(
  contributions: GoalContribution[],
  liveGoalIds: ReadonlySet<ID>,
  liveAccountIds: ReadonlySet<ID>,
  liveInvestmentIds: ReadonlySet<ID>
): Earmarks {
  const byAccount = new Map<ID, number>();
  const byInvestment = new Map<ID, number>();

  for (const c of contributions) {
    if (c.deleted_at || !liveGoalIds.has(c.goal_id)) continue;
    if (c.account_id && liveAccountIds.has(c.account_id)) {
      byAccount.set(c.account_id, (byAccount.get(c.account_id) ?? 0) + c.amount);
    } else if (c.investment_id && liveInvestmentIds.has(c.investment_id)) {
      byInvestment.set(c.investment_id, (byInvestment.get(c.investment_id) ?? 0) + c.amount);
    }
  }

  // Withdrawals net off within a source, but a source can never reserve less
  // than nothing: taking more back out than was ever put in is a correction, not
  // a negative claim on the balance.
  const fromAccounts = clampToZero(byAccount);
  const fromInvestments = clampToZero(byInvestment);

  return {
    byAccount,
    byInvestment,
    fromAccounts,
    fromInvestments,
    total: fromAccounts + fromInvestments,
  };
}

/** Floor every entry at zero in place, returning the total. */
function clampToZero(map: Map<ID, number>): number {
  let total = 0;
  for (const [id, amount] of map) {
    const clamped = Math.max(0, amount);
    map.set(id, clamped);
    total += clamped;
  }
  return total;
}
