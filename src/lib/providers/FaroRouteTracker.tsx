'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { initFaro } from '@/instrumentation-client';
import { markNavigationStart } from '@/lib/observability/navigationClock';
import { routePattern } from '@/lib/observability/routePattern';

const MAX_START_AGE_MS = 30_000;

export function FaroRouteTracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const navStart = useRef<number | null>(null);
  const first = useRef(true);
  const lastRoute = useRef(typeof window === 'undefined' ? '' : window.location.pathname + window.location.search);

  useEffect(() => {
    const faro = initFaro();
    if (faro) {
      faro.api.pushEvent('page_view', { pathname });
    }
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      // Modified or non-primary clicks open elsewhere; they are not this tab's navigation.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Hash-only links (and links to the current address) change no route.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      navStart.current = performance.now();
      markNavigationStart(navStart.current);
    };
    // popstate fires after the address changed, so compare with the last route seen.
    const onPop = () => {
      if (window.location.pathname + window.location.search === lastRoute.current) return;
      navStart.current = performance.now();
      markNavigationStart(navStart.current);
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPop);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      lastRoute.current = window.location.pathname + window.location.search;
      return;
    }
    lastRoute.current = window.location.pathname + window.location.search;
    const start = navStart.current;
    navStart.current = null;
    if (start === null || performance.now() - start > MAX_START_AGE_MS) return;
    const faro = initFaro();
    if (!faro) return;
    const route = routePattern(pathname);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        faro.api.pushMeasurement(
          { type: 'route-change', values: { duration_ms: Math.round(performance.now() - start) } },
          { context: { route } },
        );
        // Used: a later screen must not inherit this start.
        markNavigationStart(null);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [pathname, search]);

  return null;
}
