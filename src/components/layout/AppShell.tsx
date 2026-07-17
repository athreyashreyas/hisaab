import { useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SideNav } from './SideNav';
import { BottomNav } from './BottomNav';
import { Fab } from './Fab';
import { AddSheet } from '../add/AddSheet';
import { UpdateOverlay } from '../ui/UpdateOverlay';

/**
 * The frame every page sits in: side rail (md+) or bottom nav (phone), a scroll
 * region for the routed page, and the global overlays (Add sheet, changelog,
 * update veil) mounted once here so they float above whatever screen is active.
 *
 * Layout rule that matters: the top safe-area inset lives on <main>, OUTSIDE the
 * scroller, and a plain nested div does the actual scrolling. Put the inset on
 * the scrolling element (or on its content) and the padding scrolls away with
 * the content, sliding it under the status bar's clock and battery. The bottom
 * nav is a normal flex child rather than position:fixed, so it sits flush to the
 * true bottom without fighting the dynamic viewport.
 */
export function AppShell() {
  const { pathname } = useLocation();
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Switching tabs lands at the top of the new tab rather than inheriting
  // wherever the last one happened to be scrolled to.
  useLayoutEffect(() => {
    scrollerRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-parchment-100">
      <SideNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col pt-safe pl-safe pr-safe">
          <div ref={scrollerRef} className="scroll-ios min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-2xl px-4 pb-28 md:pb-10">
              <Outlet />
            </div>
          </div>
        </main>
        <BottomNav />
      </div>

      <Fab />
      <AddSheet />
      <UpdateOverlay />
    </div>
  );
}
