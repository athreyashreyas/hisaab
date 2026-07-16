import { Outlet } from 'react-router-dom';
import { SideNav } from './SideNav';
import { BottomNav } from './BottomNav';
import { AddSheet } from '../add/AddSheet';
import { ChangelogModal } from '../ChangelogModal';
import { UpdateOverlay } from '../ui/UpdateOverlay';
import { useUIStore } from '../../stores/uiStore';

/**
 * The frame every page sits in: side rail (md+) or bottom nav (phone), a scroll
 * region for the routed page, and the global overlays (Add sheet, changelog,
 * update veil) mounted once here so they float above whatever screen is active.
 */
export function AppShell() {
  const { changelogOpen, closeChangelog } = useUIStore();

  return (
    <div className="flex h-full w-full overflow-hidden bg-parchment-100">
      <SideNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 overflow-y-auto scroll-ios">
          <div className="mx-auto w-full max-w-2xl px-4 pt-safe pb-28 md:pb-10">
            <Outlet />
          </div>
        </main>
        <BottomNav />
      </div>

      <AddSheet />
      <ChangelogModal open={changelogOpen} onClose={closeChangelog} />
      <UpdateOverlay />
    </div>
  );
}
