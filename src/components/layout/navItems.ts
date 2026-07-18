/**
 * The five destinations: Home · Ledger · Goals · Insights · Settings.
 *
 * The add action is no longer a nav slot — it's a floating button pinned to the
 * bottom-right, above this bar. That frees the fifth slot for Settings, which
 * now carries the guide and What's new, and it keeps the bar to one job: going
 * places. Add is an action, not a destination.
 */
export interface NavItem {
  to: string;
  label: string;
  icon: string; // lucide-react name
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Home', icon: 'house' },
  { to: '/ledger', label: 'Ledger', icon: 'list' },
  { to: '/goals', label: 'Goals', icon: 'target' },
  { to: '/invest', label: 'Invest', icon: 'trending-up' },
  { to: '/insights', label: 'Insights', icon: 'pie-chart' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export const settingsItem: NavItem = navItems[navItems.length - 1];
