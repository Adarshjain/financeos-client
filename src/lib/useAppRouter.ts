'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { routeOf, trackRoute } from '@/lib/busy';
import { markReplace } from '@/lib/navigationIntent';

export type AppRouter = ReturnType<typeof useRouter>;

/**
 * next/navigation's router, with push and replace also telling the top bar that a page change is pending (the bar then
 * shows for code-driven filters, pagers and the like, not only link clicks). Every call reaches the real router unchanged.
 */
export function useAppRouter(): AppRouter {
  const router = useRouter();
  return React.useMemo<AppRouter>(
    () => ({
      ...router,
      back: () => router.back(),
      forward: () => router.forward(),
      refresh: () => router.refresh(),
      prefetch: (...args: Parameters<AppRouter['prefetch']>) => router.prefetch(...args),
      push: (...args: Parameters<AppRouter['push']>) => {
        trackRoute(args[0]);
        router.push(...args);
      },
      replace: (...args: Parameters<AppRouter['replace']>) => {
        // A replace onto another page takes the current in-app history entry instead of adding one.
        const target = routeOf(args[0]);
        if (target && target.pathname !== window.location.pathname) markReplace(target.pathname);
        trackRoute(args[0]);
        router.replace(...args);
      },
    }),
    [router],
  );
}
