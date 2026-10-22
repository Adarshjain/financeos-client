'use client';

import React from 'react';

import { PageError } from '@/features/shell/PageError';

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
  return <PageError error={error} reset={reset} unstable_retry={unstable_retry} shell={{ title: 'Error' }} />;
}
