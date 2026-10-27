'use client';

import React from 'react';

import { DASHBOARDS_CRUMB, DASHBOARDS_HREF } from '@/features/dashboards/routes';
import { PageError } from '@/features/shell/PageError';

export default function DsDashboardError({
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
      what="this dashboard"
      shell={{ crumb: DASHBOARDS_CRUMB, title: 'Dashboard', backHref: DASHBOARDS_HREF }}
    />
  );
}
