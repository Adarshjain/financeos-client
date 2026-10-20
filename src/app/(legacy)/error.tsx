'use client';

import { useEffect } from 'react';

import { ErrorState } from '@/components/ErrorState';
import { getFaro } from '@/instrumentation-client';
import { errorLog } from '@/lib/diagnostics/errorLog';

/**
 * Error boundary for routes outside the protected group (login, signup, the
 * Google OAuth callback). The protected group has its own boundary so it can
 * keep the nav chrome.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    errorLog.record(error, {
      source: 'boundary',
      digest: error.digest,
      message: error.message,
      ref: error.digest,
    });

    const faro = getFaro();
    if (faro) {
      faro.api.pushError(error, {
        context: {
          digest: error.digest || '',
          route: 'root-error',
        },
      });
    }
  }, [error]);

  return <ErrorState error={error} reset={reset} />;
}
