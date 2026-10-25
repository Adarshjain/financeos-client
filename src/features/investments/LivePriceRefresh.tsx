'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { isMarketOpen } from './marketHours';

/** How often an open, visible page re-reads its prices. A default the owner may change. */
export const LIVE_REFRESH_MS = 5 * 60_000;
/** The least gap between two refreshes caused by returning to the tab or window. */
const FOCUS_REFRESH_MS = 30_000;
const CHECK_MS = 60_000;

/** Keeps a price page fresh in market hours: never on mount, then on a timer, on return to the tab, and once when the market closes. */
export function useLivePriceRefresh(): void {
  const router = useRouter();
  const routerRef = React.useRef(router);

  React.useEffect(() => {
    routerRef.current = router;
  }, [router]);

  React.useEffect(() => {
    let last = Date.now();
    let wasOpen = isMarketOpen(new Date());
    const refresh = () => {
      last = Date.now();
      routerRef.current.refresh();
    };
    const visible = () => document.visibilityState === 'visible';

    const tick = () => {
      // Hidden or frozen tabs keep wasOpen, so the closing refresh happens when the page is seen again.
      if (!visible()) return;
      const open = isMarketOpen(new Date());
      if (wasOpen && !open) {
        wasOpen = false;
        refresh();
        return;
      }
      wasOpen = open;
      if (open && Date.now() - last >= LIVE_REFRESH_MS) refresh();
    };
    const onReturn = () => {
      if (!visible()) return;
      const open = isMarketOpen(new Date());
      if (wasOpen && !open) {
        wasOpen = false;
        refresh();
        return;
      }
      wasOpen = open;
      if (open && Date.now() - last >= FOCUS_REFRESH_MS) refresh();
    };

    const timer = window.setInterval(tick, CHECK_MS);
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, []);
}

/** Renders nothing; mount it on a page that shows prices. */
export function LivePriceRefresh(): null {
  useLivePriceRefresh();
  return null;
}
