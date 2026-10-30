import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { Hero } from '@/components/ds/Hero/Hero';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';

/** Totals and rows keep their places while the list loads. */
export function UpcomingSkeleton() {
  return (
    <>
      <Hero.Skeleton label figures={2} />
      <UpcomingRowsSkeleton />
    </>
  );
}

/** The Upcoming list while it loads: the totals and rows. */
export function UpcomingPageSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <UpcomingSkeleton />
    </div>
  );
}

/** The Upcoming calendar while it loads: the month header and rows. */
export function UpcomingCalendarSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Card title={<Skeleton width={140} height={16} />} subtitle={<Skeleton width={120} height={12} />} />
      <UpcomingRowsSkeleton />
    </div>
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
