import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { APP_VERSION } from '../../lib/changelog';
import { getSeenVersionLocal, isNewerVersion, setSeenVersionLocal } from '../../lib/whatsNew';
import { consumePendingGuide } from '../../lib/guideRoute';

/**
 * The one-time boot decision, mirroring Harmony's AuthGate: right after the app
 * mounts, either land a just-onboarded user on the guide walk-through, or greet
 * a returning user with What's-new when the app has updated to a newer version
 * since they last saw it. Both are once-only (the pending flag is read-and-clear;
 * the seen-version marker is written immediately), and neither fires on a plain
 * reopen of a version already seen.
 */
export function RootBoot() {
  const navigate = useNavigate();
  const location = useLocation();
  const decided = useRef(false);

  useEffect(() => {
    if (decided.current) return;
    decided.current = true;

    // Fresh onboarding just finished → open the full walk-through.
    if (consumePendingGuide()) {
      navigate('/guide?pane=guide', { replace: true });
      return;
    }

    // A genuinely newer version for this device → open What's new, once.
    if (isNewerVersion(APP_VERSION, getSeenVersionLocal())) {
      setSeenVersionLocal(APP_VERSION);
      if (location.pathname !== '/guide') {
        navigate('/guide?pane=new', { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Outlet />;
}
