import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { LedgerPage } from './pages/LedgerPage';
import { GoalsPage } from './pages/GoalsPage';
import { GoalDetailPage } from './pages/GoalDetailPage';
import { InsightsPage } from './pages/InsightsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AccountsPage } from './pages/AccountsPage';
import { CategoriesPage } from './pages/CategoriesPage';

export const router = createBrowserRouter([
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
]);
