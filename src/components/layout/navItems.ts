/**
 * The five destinations: Home · Ledger · Money · Insights · Settings.
 *
 * Money is a hub, not a leaf: accounts, goals and investments are all "what you
 * have and what it's promised to", and each used to occupy its own slot (or, in
 * Accounts' case, hide inside Settings) with nothing tying them together. Six
 * tabs on a phone was one too many to scan, and it split one subject three ways.
 *
 * The add action isn't a nav slot either — it's a floating button pinned to the
 * bottom-right, above the bar (see Fab), so this bar has one job: going places.
 */
export interface NavItem {
  to: string;
  label: string;
  icon: string; // lucide-react name
  /**
   * Extra path prefixes this tab owns, so a sub-screen still lights up its
   * parent. Without it, opening a goal from Money would leave no tab active.
   */
  owns?: string[];
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Home', icon: 'house' },
  { to: '/ledger', label: 'Ledger', icon: 'list' },
  {
    to: '/money',
    label: 'Money',
    icon: 'wallet',
    owns: ['/goals', '/invest', '/settings/accounts'],
  },
  { to: '/insights', label: 'Insights', icon: 'pie-chart' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export const settingsItem: NavItem = navItems[navItems.length - 1];

/** Whether `pathname` belongs to a nav item, including the paths it owns. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.to === '/') return pathname === '/';
  // Settings owns /settings/* generally, but not the accounts screen, which
  // reads as part of Money — so check the more specific claims first.
  if (item.owns?.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  if (navItems.some((other) => other !== item && other.owns?.includes(pathname))) return false;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
