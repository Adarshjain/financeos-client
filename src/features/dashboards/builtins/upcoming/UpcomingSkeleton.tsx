import React from 'react';

import { Skeleton } from '@/components/ds/Skeleton/Skeleton';

/** Rows of a date tile, a title and an amount. */
export function UpcomingSkeleton() {
  return (
    <div data-testid="widget-skeleton">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-space-12 px-space-16 py-space-10">
          <Skeleton width={40} height={36} />
          <Skeleton height={14} className="flex-1" />
          <Skeleton width={56} height={14} />
        </div>
      ))}
    </div>
  );
}
