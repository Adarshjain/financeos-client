import React from 'react';

import { Card, KpiTile, ListRow, Skeleton } from '@/components/ds';

/** Totals and rows keep their places while the list loads. */
export function UpcomingSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 desk:grid-cols-4 gap-space-12 desk:gap-space-16">
        <KpiTile loading />
        <KpiTile loading />
        <KpiTile loading />
        <KpiTile loading />
      </div>
      <UpcomingRowsSkeleton />
    </>
  );
}

export function UpcomingRowsSkeleton() {
  return (
    <Card>
      {Array.from({ length: 4 }, (_, i) => (
        <ListRow
          key={i}
          leading={<Skeleton width={40} height={40} />}
          title={<Skeleton width="45%" height={14} />}
          subtitle={<Skeleton width="30%" height={12} />}
          trailing={<Skeleton width={64} height={20} />}
        />
      ))}
    </Card>
  );
}
