/** The five destinations: Home · Ledger · [+] · Goals · Insights. Settings lives in the header/rail. */
export interface NavItem {
  to: string;
  label: string;
  icon: string; // lucide-react name
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Home', icon: 'house' },
  { to: '/ledger', label: 'Ledger', icon: 'list' },
  { to: '/goals', label: 'Goals', icon: 'target' },
  { to: '/insights', label: 'Insights', icon: 'pie-chart' },
];

export const settingsItem: NavItem = { to: '/settings', label: 'Settings', icon: 'settings' };
