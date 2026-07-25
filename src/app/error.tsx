'use client';

import { ErrorState } from '@/components/ErrorState';

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
  return <ErrorState error={error} reset={reset} />;
}
