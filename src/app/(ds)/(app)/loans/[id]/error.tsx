'use client';

import React from 'react';

import { PageError } from '@/features/shell/PageError';
import { appHref } from '@/features/shell/routes';

export default function DsLoanError({
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
      what="this loan"
      shell={{ crumb: 'Owe & lend / Loans', title: 'Loan', backHref: appHref('/loans') }}
    />
  );
}
