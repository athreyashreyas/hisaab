/**
 * Coordinates the one-time "land on the guide right after onboarding" hand-off
 * between OnboardingFlow (which sets the flag as the app is about to mount) and
 * the shell (which consumes it once and navigates to the guide walk-through).
 */
export const PENDING_GUIDE_KEY = 'hisaab.pendingGuide';

/** Read-and-clear: returns true at most once after onboarding completes. */
export function consumePendingGuide(): boolean {
  try {
    if (localStorage.getItem(PENDING_GUIDE_KEY) === '1') {
      localStorage.removeItem(PENDING_GUIDE_KEY);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}
