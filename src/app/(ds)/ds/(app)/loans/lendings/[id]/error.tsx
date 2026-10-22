'use client';

import React from 'react';

import { LENDINGS_HREF } from '@/features/loans/loansLendingsTabs';
import { PageError } from '@/features/shell/PageError';

export default function DsPersonError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  unstable_retry?: () => void;
}) {
  return (
    <PageError
      error={error}
      reset={reset}
      unstable_retry={unstable_retry}
      what="this person"
      shell={{ crumb: 'Owe & lend / Lendings', title: 'Person', backHref: LENDINGS_HREF }}
    />
  );
}
