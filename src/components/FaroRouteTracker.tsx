'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { initFaro } from '@/instrumentation-client';

export function FaroRouteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const faro = initFaro();
    if (faro) {
      faro.api.pushEvent('page_view', { pathname });
    }
  }, [pathname]);

  return null;
}
