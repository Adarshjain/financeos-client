import React from 'react';

import { Card, Skeleton } from '@/components/ds';

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

/** The Statements tab's shape: the list on the left, the selected statement on the right. */
export default function DsAccountStatementsLoading() {
  return (
    <div className="grid grid-cols-1 desk:grid-cols-12 items-start gap-x-space-12 gap-y-space-8 desk:gap-space-16">
      <div className="desk:col-span-5">
        <SkeletonCard rows={3} />
      </div>
      <div className="desk:col-span-7">
        <SkeletonCard rows={8} />
      </div>
    </div>
  );
}
