'use client';

import { ErrorState } from '@/components/ErrorState';

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
  return <ErrorState error={error} reset={reset} />;
}
