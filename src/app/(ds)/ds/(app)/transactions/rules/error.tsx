'use client';

import React from 'react';

import { PageError } from '@/features/shell/PageError';

export default function DsRulesError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  unstable_retry?: () => void;
}) {
  return <PageError error={error} reset={reset} unstable_retry={unstable_retry} what="rules" shell={{ crumb: 'Money / Transactions', title: 'Rules' }} />;
}
