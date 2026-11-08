'use client';

import React from 'react';

import { useAppRouter } from '@/lib/useAppRouter';

/**
 * A function that drops the client router cache (the main Settings page's values are server-rendered), and whether the refresh is
 * still loading: a control that saves and then refreshes stays pending until the new values show. It is a no-op outside
 * an app router (tests, Storybook), so the hooks that call it still render there.
 */
export function useRouterRefreshState(): { refresh: () => void; pending: boolean } {
  let router: ReturnType<typeof useAppRouter> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useAppRouter();
  } catch {
    router = null;
  }
  const [pending, startTransition] = React.useTransition();
  return { refresh: () => startTransition(() => router?.refresh()), pending };
}

/** Just the refresh function of `useRouterRefreshState`. */
export function useRouterRefresh(): () => void {
  return useRouterRefreshState().refresh;
}
