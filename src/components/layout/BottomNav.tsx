import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '../ui/Icon';
import { navItems } from './navItems';
import { cn } from '../../lib/cn';

/**
 * Phone bottom nav: five equal destinations, Settings on the right. The add
 * button used to sit in the centre slot; it's now a floating button over the
 * bottom-right corner (see Fab), so this bar is purely for navigation.
 *
 * Not position:fixed — it's a flex child of the shell, so it stays flush to the
 * true bottom of the visible viewport, and pb-safe (via .bottom-nav) keeps the
 * labels above the home indicator.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="bottom-nav flex shrink-0 items-stretch justify-around border-t border-parchment-200 bg-parchment-50 pl-[max(0.25rem,var(--safe-left))] pr-[max(0.25rem,var(--safe-right))] shadow-[0_-2px_10px_rgba(26,26,24,0.05)] md:hidden"
    >
      {navItems.map((item) => (
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
          'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors',
          isActive ? 'text-teal-600' : 'text-ink-300'
        )
      }
    >
      {({ isActive }) => (
        <>
          <motion.span whileTap={{ scale: 0.9 }} className="flex items-center justify-center">
            <Icon name={icon} size={21} strokeWidth={isActive ? 2.4 : 2} />
          </motion.span>
          {label}
        </>
      )}
    </NavLink>
  );
}
