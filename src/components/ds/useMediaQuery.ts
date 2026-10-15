'use client';

import { useCallback, useSyncExternalStore } from 'react';

function canMatch(): boolean {
  return (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  );
}

/**
 * Hook to match a CSS media query with clean SSR hydration.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!canMatch()) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = () =>
    canMatch() ? window.matchMedia(query).matches : serverValue;

  return useSyncExternalStore(subscribe, getSnapshot, () => serverValue);
}

/**
 * Returns true when viewport is below the `sm` breakpoint (< 640px).
 */
export function useIsPhone(): boolean {
  return useMediaQuery('(max-width: 639.98px)');
}
