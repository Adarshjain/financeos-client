import React from 'react';

import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { RowsSkeleton } from '@/features/dashboards/builtins/BuiltinParts';

/** The headline figure, then one line per card. */
export function RewardsEarnedSkeleton() {
  return (
    <div data-testid="widget-skeleton">
      <Skeleton width="40%" height={22} />
      <RowsSkeleton rows={3} />
    </div>
  );
}
