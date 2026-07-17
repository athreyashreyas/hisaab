import { NavLink } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Icon } from '../ui/Icon';
import { navItems, settingsItem } from './navItems';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/cn';

/** Side rail at md+, mirroring the bottom nav's destinations with the add action on top. */
export function SideNav() {
  const openAdd = useUIStore((s) => s.openAdd);

  return (
    <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-parchment-200 bg-parchment-50 px-3 pb-safe pl-safe pt-safe md:flex">
      <div className="flex items-center gap-2 px-3 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-card bg-teal-500 font-serif text-lg text-white">
          ₹
        </div>
        <span className="font-serif text-2xl text-ink-900">Hisaab</span>
      </div>

      <button
        onClick={openAdd}
        className="mb-2 flex items-center gap-2.5 rounded-card bg-teal-500 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-teal-600"
      >
        <Plus size={20} strokeWidth={2.5} />
        Add transaction
      </button>

      {/* Settings is the last nav item, but on the rail it belongs at the
          bottom rather than in the main run — so it's rendered separately. */}
      <nav className="flex flex-col gap-0.5">
        {navItems
          .filter((item) => item.to !== settingsItem.to)
          .map((item) => (
            <RailLink key={item.to} {...item} />
          ))}
      </nav>

      <div className="mt-auto pb-4">
        <RailLink {...settingsItem} />
      </div>
    </aside>
  );
}

function RailLink({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-card px-3 py-2.5 text-[15px] font-semibold transition-colors',
          isActive ? 'bg-teal-50 text-teal-700' : 'text-ink-500 hover:bg-parchment-200 hover:text-ink-900'
        )
      }
    >
      <Icon name={icon} size={20} />
      {label}
    </NavLink>
  );
}
