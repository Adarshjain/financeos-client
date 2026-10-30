import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { GRID_GAP } from '@/components/ds/gridGap';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';

function SkeletonCard({ rows }: { rows: number }) {
  return (
    <Card>
      <div className="p-space-16">
        <Skeleton width="40%" height={16} />
      </div>
      <div className="px-space-16 pb-space-16 flex flex-col gap-space-8 desk:gap-space-12">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} height={16} />
        ))}
      </div>
    </Card>
  );
}

/** Loading shape of the Notifications tab; shared by the route's loading.tsx and the client query. */
export function NotificationsSkeleton() {
  return (
    <div className={`grid grid-cols-1 desk:grid-cols-12 items-start ${GRID_GAP}`} data-testid="notifications-skeleton">
      <div className="desk:col-span-7 flex flex-col gap-space-8 desk:gap-space-16">
        <SkeletonCard rows={4} />
        <SkeletonCard rows={7} />
        <SkeletonCard rows={3} />
      </div>
      <div className="desk:col-span-5 flex flex-col gap-space-8 desk:gap-space-16">
        <SkeletonCard rows={3} />
        <SkeletonCard rows={2} />
        <SkeletonCard rows={3} />
      </div>
    </div>
  );
}
