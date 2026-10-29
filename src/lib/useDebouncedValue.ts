'use client';

import * as React from 'react';

/** The one pause for typed search text everywhere, before a search or a count goes to the server. */
export const SEARCH_DEBOUNCE_MS = 300;

/** Returns `value` once it has stopped changing for `delayMs`. It starts as `initialValue` (the value itself unless given), so a first value can wait for the pause too. */
export function useDebouncedValue<T>(value: T, delayMs: number, initialValue: T = value): T {
  const [debounced, setDebounced] = React.useState(initialValue);

  React.useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
