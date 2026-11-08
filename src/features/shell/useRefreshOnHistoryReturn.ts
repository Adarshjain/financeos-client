'use client';

import { startTransition, useCallback, useEffect, useRef } from 'react';

import { getQueryClient } from '@/lib/query/client';
import { useAppRouter } from '@/lib/useAppRouter';

const here = () => `${window.location.pathname}${window.location.search}`;

/**
 * Back, Forward and a bfcache restore show the router cache's old copy of a page. After one, refresh it once
 * (the cached page stays on screen until the fresh server data swaps in) and refetch the active react-query queries
 * (a refresh does not remount them, and the 30 s staleTime would keep them as they were).
 * A normal push, replace or link never refreshes. Pass the committed pathname and search.
 */
export function useRefreshOnHistoryReturn(pathname: string, search: string) {
  const router = useAppRouter();
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);
  // The URL a popstate landed on, until the route commit for it is seen.
  const popUrl = useRef<string | null>(null);
  const committed = useRef<string | null>(null);

  const refresh = useCallback(() => {
    startTransition(() => routerRef.current.refresh());
    void getQueryClient().invalidateQueries({ refetchType: 'active' });
  }, []);

  useEffect(() => {
    const onPop = () => {
      popUrl.current = here();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [refresh]);

  useEffect(() => {
    const url = `${pathname}${search ? `?${search}` : ''}`;
    const previous = committed.current;
    committed.current = url;
    const pop = popUrl.current;
    // A pop that never committed (the leave guard put the address back) must not refresh a later push.
    if (pop === null || pop !== here()) {
      popUrl.current = null;
      return;
    }
    popUrl.current = null;
    // Same URL (strict-mode re-run, hash-only pop): nothing new was restored.
    if (previous !== null && previous === url) return;
    refresh();
  }, [pathname, search, refresh]);
}
