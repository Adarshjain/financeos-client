'use client';

import React, { useEffect } from 'react';

import { areaError } from '@/features/shell/areaError';
import { APP_LOCKED_EVENT, isAppLockedResult } from '@/lib/appLock';

const Boundary = areaError({ title: 'Error' });

/** Any /ds page without its own error boundary: the shell stays, the page says what failed. */
export default function DsAppError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  unstable_retry?: () => void;
}) {
  // Safety net: a render that failed because the app locked mid-flight goes to the lock screen.
  useEffect(() => {
    if (isAppLockedResult(error)) {
      window.dispatchEvent(new CustomEvent(APP_LOCKED_EVENT));
      return;
    }
    void fetch('/api/v1/app-lock/status', { credentials: 'same-origin', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((status: { armed?: boolean; locked?: boolean } | null) => {
        if (status?.armed && status.locked) window.dispatchEvent(new CustomEvent(APP_LOCKED_EVENT));
      })
      .catch(() => undefined); // Offline or a blip: the error screen stands as it is.
  }, [error]);

  return <Boundary error={error} reset={reset} unstable_retry={unstable_retry} />;
}
