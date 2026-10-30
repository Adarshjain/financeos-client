import React from 'react';

import { Skeleton } from '@/components/ds/Skeleton/Skeleton';

/** Three two-line rows: the bell's dropdown while its code or its feed loads. */
export function NotificationsDropdownSkeleton() {
  return (
    <div data-testid="notifications-skeleton">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-space-6 px-space-16 py-space-10">
          <Skeleton height={14} width="70%" />
          <Skeleton height={12} width="50%" />
        </div>
      ))}
    </div>
  );
}
