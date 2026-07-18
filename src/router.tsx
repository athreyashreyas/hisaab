import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { RootBoot } from './components/layout/RootBoot';
import { HomePage } from './pages/HomePage';
import { RouteFallback } from './components/ui/RouteFallback';

// Home is eager so the first screen paints with no extra round-trip. Everything
// else is code-split: the initial bundle stays small (no recharts, no guide art,
// no investment/insights screens) so a cold open reaches Home fast, and each
// other screen streams in on first navigation behind a calm fallback.
const LedgerPage = lazy(() => import('./pages/LedgerPage').then((m) => ({ default: m.LedgerPage })));
const GoalsPage = lazy(() => import('./pages/GoalsPage').then((m) => ({ default: m.GoalsPage })));
const GoalDetailPage = lazy(() =>
  import('./pages/GoalDetailPage').then((m) => ({ default: m.GoalDetailPage }))
);
const InvestmentsPage = lazy(() =>
  import('./pages/InvestmentsPage').then((m) => ({ default: m.InvestmentsPage }))
);
const InsightsPage = lazy(() =>
  import('./pages/InsightsPage').then((m) => ({ default: m.InsightsPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const AccountsPage = lazy(() =>
  import('./pages/AccountsPage').then((m) => ({ default: m.AccountsPage }))
);
const CategoriesPage = lazy(() =>
  import('./pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage }))
);
const GuidePage = lazy(() => import('./pages/GuidePage').then((m) => ({ default: m.GuidePage })));

/** Wrap a lazily-loaded screen in a Suspense boundary with a quiet fallback. */
function L(node: ReactNode): ReactNode {
  return <Suspense fallback={<RouteFallback />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  {
    // RootBoot runs the one-time "land on guide / show what's new" decision and
    // renders the matched route below it.
    element: <RootBoot />,
    children: [
      // Full-screen guide / what's-new, outside the nav shell.
      { path: '/guide', element: L(<GuidePage />) },
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'ledger', element: L(<LedgerPage />) },
          { path: 'goals', element: L(<GoalsPage />) },
          { path: 'goals/:id', element: L(<GoalDetailPage />) },
          { path: 'invest', element: L(<InvestmentsPage />) },
          { path: 'insights', element: L(<InsightsPage />) },
          { path: 'settings', element: L(<SettingsPage />) },
          { path: 'settings/accounts', element: L(<AccountsPage />) },
          { path: 'settings/categories', element: L(<CategoriesPage />) },
        ],
      },
    ],
  },
]);
