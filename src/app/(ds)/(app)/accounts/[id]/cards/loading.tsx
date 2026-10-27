import React from 'react';

import { Card, Skeleton } from '@/components/ds';

function SkeletonHolder() {
  return (
    <Card>
      <div className="p-space-16 flex flex-col gap-space-8 desk:gap-space-12">
        <Skeleton width="50%" height={16} />
        <Skeleton height={32} />
        <Skeleton height={16} />
        <Skeleton height={16} />
      </div>
    </Card>
  );
}

/** The Cards tab's shape: two cardholder cards side by side, then the shared limit. */
export default function DsAccountCardsLoading() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <div className="grid grid-cols-1 desk:grid-cols-2 items-start gap-x-space-12 gap-y-space-8 desk:gap-space-16">
        <SkeletonHolder />
        <SkeletonHolder />
      </div>
      <Card>
        <div className="p-space-16 flex flex-col gap-space-8">
          <Skeleton width="30%" height={16} />
          <Skeleton height={16} />
        </div>
      </Card>
    </div>
  );
}
