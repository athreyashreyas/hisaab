import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { RootBoot } from './components/layout/RootBoot';
import { HomePage } from './pages/HomePage';
import { LedgerPage } from './pages/LedgerPage';
import { GoalsPage } from './pages/GoalsPage';
import { GoalDetailPage } from './pages/GoalDetailPage';
import { InsightsPage } from './pages/InsightsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AccountsPage } from './pages/AccountsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { GuidePage } from './pages/GuidePage';

export const router = createBrowserRouter([
  {
    // RootBoot runs the one-time "land on guide / show what's new" decision and
    // renders the matched route below it.
    element: <RootBoot />,
    children: [
      // Full-screen guide / what's-new, outside the nav shell.
      { path: '/guide', element: <GuidePage /> },
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'ledger', element: <LedgerPage /> },
          { path: 'goals', element: <GoalsPage /> },
          { path: 'goals/:id', element: <GoalDetailPage /> },
          { path: 'insights', element: <InsightsPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'settings/accounts', element: <AccountsPage /> },
          { path: 'settings/categories', element: <CategoriesPage /> },
        ],
      },
    ],
  },
]);
