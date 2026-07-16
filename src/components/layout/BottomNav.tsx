import { NavLink } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { Fab } from './Fab';
import { navItems } from './navItems';
import { cn } from '../../lib/cn';

/**
 * Phone bottom nav with the teal FAB in the centre slot (mockup .nav). Five slots:
 * two nav items, the FAB, two more nav items.
 */
export function BottomNav() {
  const [home, ledger, goals, insights] = navItems;
  const left = [home, ledger];
  const right = [goals, insights];

  return (
    <nav className="bottom-nav flex items-center justify-around border-t border-parchment-200 bg-parchment-50 px-2 shadow-[0_-2px_10px_rgba(26,26,24,0.05)] md:hidden">
      {left.map((item) => (
        <NavItemLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
      ))}
      <div className="flex flex-1 justify-center">
        <Fab />
      </div>
      {right.map((item) => (
        <NavItemLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
      ))}
    </nav>
  );
}

function NavItemLink({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold',
          isActive ? 'text-teal-600' : 'text-ink-300'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon name={icon} size={21} strokeWidth={isActive ? 2.4 : 2} />
          {label}
        </>
      )}
    </NavLink>
  );
}
