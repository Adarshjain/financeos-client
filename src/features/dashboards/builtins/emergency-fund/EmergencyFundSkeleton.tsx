import React from 'react';

import { Skeleton } from '@/components/ds/Skeleton/Skeleton';

/** The months figure and its line, the balance line, then the month bars. */
export function EmergencyFundSkeleton() {
  return (
    <div className="flex flex-col gap-space-8" data-testid="widget-skeleton">
      <Skeleton width="50%" height={22} />
      <Skeleton width="70%" height={12} />
      <Skeleton width="40%" height={12} />
      <Skeleton height={64} />
    </div>
  );
}
