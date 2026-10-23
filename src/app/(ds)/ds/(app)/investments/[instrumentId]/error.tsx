'use client';

import React from 'react';

import { HOLDINGS_HREF } from '@/features/investments/investmentsTabs';
import { PageError } from '@/features/shell/PageError';

export default function DsHoldingError({
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
      what="this holding"
      shell={{ crumb: 'Grow / Investments', title: 'Holding', backHref: HOLDINGS_HREF }}
    />
  );
}
