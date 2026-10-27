import React from 'react';

import { Card, Skeleton } from '@/components/ds';

function SkeletonCard({ rows }: { rows: number }) {
  return (
    <Card>
      <div className="p-space-16 flex flex-col gap-space-8 desk:gap-space-12">
        <Skeleton width="40%" height={16} />
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} height={16} />
        ))}
      </div>
    </Card>
  );
}

/** The Rewards tab's shape: four tiles, then the earning lines beside the milestone and rules. */
export default function DsAccountRewardsLoading() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <div className="grid grid-cols-2 desk:grid-cols-4 gap-x-space-12 gap-y-space-8 desk:gap-space-16">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} rows={1} />
        ))}
      </div>
      <div className="grid grid-cols-1 desk:grid-cols-12 items-start gap-x-space-12 gap-y-space-8 desk:gap-space-16">
        <div className="desk:col-span-7">
          <SkeletonCard rows={8} />
        </div>
        <div className="desk:col-span-5 flex flex-col gap-space-8 desk:gap-space-16">
          <SkeletonCard rows={3} />
          <SkeletonCard rows={3} />
        </div>
      </div>
    </div>
  );
}
