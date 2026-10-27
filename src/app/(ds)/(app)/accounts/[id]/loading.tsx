import React from 'react';

import { Card, Skeleton } from '@/components/ds';

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="px-space-16 pb-space-16 flex flex-col gap-space-12">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={16} />
      ))}
    </div>
  );
}

function SkeletonCard({ rows }: { rows: number }) {
  return (
    <Card>
      <div className="p-space-16">
        <Skeleton width="40%" height={16} />
      </div>
      <SkeletonRows count={rows} />
    </Card>
  );
}

/** The card Overview's shape: header card, two columns of cards, then the table. */
export default function DsAccountLoading() {
  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <Card>
        <div className="p-space-16 flex flex-col gap-space-8">
          <Skeleton width={80} height={12} />
          <Skeleton width={160} height={32} />
          <Skeleton width={220} height={12} />
        </div>
      </Card>
      <div className="grid grid-cols-1 desk:grid-cols-12 items-start gap-space-12 desk:gap-space-16">
        <div className="desk:col-span-7 flex flex-col gap-space-12 desk:gap-space-16">
          <SkeletonCard rows={3} />
          <SkeletonCard rows={3} />
        </div>
        <div className="desk:col-span-5 flex flex-col gap-space-12 desk:gap-space-16">
          <SkeletonCard rows={2} />
        </div>
      </div>
      <SkeletonCard rows={6} />
    </div>
  );
}
