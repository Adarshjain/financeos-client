'use client';

import React from 'react';

import { REPORTS_HREF } from '@/features/reports/list/reportsList';
import { PageError } from '@/features/shell/PageError';

export default function DsReportError({
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
      what="this report"
      shell={{ crumb: 'Insights / Reports', title: 'Report', backHref: REPORTS_HREF }}
    />
  );
}
