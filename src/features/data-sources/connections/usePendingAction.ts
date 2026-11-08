'use client';

import React from 'react';

/** Runs one async action at a time and says which key is in flight; a press while one is pending does nothing. */
export function usePendingAction() {
  const [pending, setPending] = React.useState<string | null>(null);
  const busy = React.useRef(false);
  const run = React.useCallback((key: string, action: () => Promise<unknown> | unknown) => {
    if (busy.current) return;
    busy.current = true;
    setPending(key);
    let result: Promise<unknown> | unknown;
    try {
      result = action();
    } catch {
      result = undefined;
    }
    void Promise.resolve(result)
      .catch(() => {})
      .finally(() => {
        busy.current = false;
        setPending(null);
      });
  }, []);
  return { pending, run };
}
