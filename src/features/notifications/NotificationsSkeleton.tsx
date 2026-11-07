import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';

/** A day header, then rows of two text lines and a time, while the feed loads. */
export function NotificationsSkeleton() {
  return (
    <Card data-testid="notifications-skeleton">
      <div className="px-space-14 py-space-10">
        <Skeleton width={72} height={14} />
      </div>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-space-12 px-space-16 py-space-10">
          <div className="flex flex-1 flex-col gap-space-6">
            <Skeleton height={14} width="55%" />
            <Skeleton width="80%" height={12} />
          </div>
          <Skeleton width={36} height={12} />
        </div>
      ))}
    </Card>
  );
}

/** The Updates tab while the first page of the feed loads (the Inbox shell draws the bar and tabs). */
export function NotificationsPageSkeleton() {
  return <NotificationsSkeleton />;
}
