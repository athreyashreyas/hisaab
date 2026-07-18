import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { APP_VERSION } from '../../lib/changelog';
import { claimUnseenVersion } from '../../lib/whatsNew';
import { consumePendingGuide } from '../../lib/guideRoute';

/**
 * The one-time boot decision, mirroring Harmony's AuthGate: right after the app
 * mounts, either land a just-onboarded user on the guide walk-through, or greet
 * a returning user with What's new when the app has updated to a newer version
 * since they last saw it.
 *
 * Both are once-only. The pending-guide flag is read-and-clear, and
 * claimUnseenVersion marks the version seen (on this device and, sealed, on the
 * account) at the moment it answers, so a plain reopen never re-triggers either
 * — and neither does opening the app on a second device once you've read it on
 * the first.
 */
export function RootBoot() {
  const navigate = useNavigate();
  const location = useLocation();
  const decided = useRef(false);

  useEffect(() => {
    if (decided.current) return;
    decided.current = true;

    void (async () => {
      // Fresh onboarding just finished → open the full walk-through.
      if (consumePendingGuide()) {
        navigate('/guide?pane=guide', { replace: true });
        return;
      }

      // A version this account hasn't met yet → open What's new, once.
      if (await claimUnseenVersion(APP_VERSION)) {
        if (location.pathname !== '/guide') {
          navigate('/guide?pane=new', { replace: true });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Outlet />;
}
