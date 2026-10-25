import React from 'react';

import { Skeleton } from '@/components/ds';

/** The calendar grid and its legend line. */
export function SpendHeatmapSkeleton() {
  return (
    <div className="flex flex-col gap-space-8" data-testid="widget-skeleton">
      <Skeleton height={112} />
      <Skeleton width="30%" height={10} />
    </div>
  );
}
