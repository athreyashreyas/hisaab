import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '../ui/Icon';
import { navItems, isNavItemActive, type NavItem } from './navItems';
import { cn } from '../../lib/cn';

/**
 * Phone bottom nav: five equal destinations, Settings on the right. The add
 * button used to sit in the centre slot; it's now a floating button over the
 * bottom-right corner (see Fab), so this bar is purely for navigation.
 *
 * Active state is computed from the location rather than left to NavLink,
 * because a tab can own screens that don't sit under its path — Money owns
 * Goals, Invest and Accounts — and NavLink only ever matches its own `to`.
 *
 * Not position:fixed — it's a flex child of the shell, so it stays flush to the
 * true bottom of the visible viewport, and pb-safe (via .bottom-nav) keeps the
 * labels above the home indicator.
 */
export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Primary"
      className="bottom-nav flex shrink-0 items-stretch justify-around border-t border-parchment-200 bg-parchment-50 pl-[max(0.25rem,var(--safe-left))] pr-[max(0.25rem,var(--safe-right))] shadow-[0_-2px_10px_rgba(26,26,24,0.05)] md:hidden"
    >
      {navItems.map((item) => (
        <NavItemLink key={item.to} item={item} active={isNavItemActive(item, pathname)} />
      ))}
    </nav>
  );
}

function NavItemLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors',
        active ? 'text-teal-600' : 'text-ink-250'
      )}
    >
      <motion.span whileTap={{ scale: 0.9 }} className="flex items-center justify-center">
        <Icon name={item.icon} size={21} strokeWidth={active ? 2.4 : 2} />
      </motion.span>
      {item.label}
    </Link>
  );
}
