import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query is used lightly here: reads come from Dexie via useLiveQuery,
 * so most "server state" is really local. Query is kept for the async unlock/
 * hydrate/sync flows and to match the suite's structure.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
