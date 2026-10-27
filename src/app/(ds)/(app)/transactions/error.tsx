'use client';

import React from 'react';

import { PageError } from '@/features/shell/PageError';

export default function DsTransactionsError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  unstable_retry?: () => void;
}) {
  return <PageError error={error} reset={reset} unstable_retry={unstable_retry} what="transactions" shell={{ crumb: 'Money', title: 'Transactions' }} />;
}
