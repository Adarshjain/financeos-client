'use client';

import { useEffect } from 'react';

import { ErrorState } from '@/components/ErrorState';
import { getFaro } from '@/instrumentation-client';

/**
 * Error boundary for every authenticated route.
 *
 * Sits inside the protected layout, so the sidebar and mobile nav stay usable
 * and the user can navigate away instead of hitting a dead end. Server
 * Components in this group call the API unguarded (see `src/lib/apiClient.ts`,
 * which throws `ApiError` on any non-2xx), so this catches backend outages.
 */
export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const faro = getFaro();
    if (faro) {
      faro.api.pushError(error, {
        context: {
          digest: error.digest || '',
          route: 'protected-error',
        },
      });
    }
  }, [error]);

  return <ErrorState error={error} reset={reset} />;
}
