import React from 'react';

import { Card, Skeleton } from '@/components/ds';
import { UpcomingRowsSkeleton } from '@/features/upcoming/UpcomingSkeleton';

export default function DsUpcomingCalendarLoading() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Card title={<Skeleton width={140} height={16} />} subtitle={<Skeleton width={120} height={12} />} />
      <UpcomingRowsSkeleton />
    </div>
  );
}
