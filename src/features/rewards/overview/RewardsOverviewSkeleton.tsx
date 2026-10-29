import React from 'react';

import { Card, Skeleton } from '@/components/ds';

/** The overview's shape: the total, then the card list. */
export function RewardsOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <div className="flex flex-col gap-space-8">
        <Skeleton width="20%" height={12} />
        <Skeleton width="30%" height={32} />
      </div>
      <Card>
        <div className="p-space-16 flex flex-col gap-space-8 desk:gap-space-12">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} height={16} />
          ))}
        </div>
      </Card>
    </div>
  );
}
