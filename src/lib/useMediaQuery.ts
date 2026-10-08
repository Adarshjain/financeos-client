'use client';

import { useCallback, useSyncExternalStore } from 'react';

function canMatch(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

/**
 * Whether a CSS media query currently matches. The server render (and the
 * hydration pass) uses `serverValue`, then the hook switches to the real value
 * right after mount, so server and client markup never mismatch.
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
  const getSnapshot = () => (canMatch() ? window.matchMedia(query).matches : serverValue);
  return useSyncExternalStore(subscribe, getSnapshot, () => serverValue);
}

/** Below Tailwind's `md` breakpoint (768px). */
export const BELOW_MD_QUERY = '(max-width: 767.98px)';
