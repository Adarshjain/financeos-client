import React from 'react';

import { Card, Skeleton } from '@/components/ds';

/** Section shapes while the inbox loads: a header bar, then rows of square, two lines and a button. */
export function InboxSkeleton() {
  return (
    <Card data-testid="inbox-skeleton">
      {[3, 2].map((rows, group) => (
        <div key={group}>
          <div className="px-space-14 py-space-10">
            <Skeleton width={96} height={14} />
          </div>
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-space-12 px-space-16 py-space-10">
              <Skeleton width={32} height={32} />
              <div className="flex flex-1 flex-col gap-space-6">
                <Skeleton height={14} />
                <Skeleton width="60%" height={12} />
              </div>
              <Skeleton width={64} height={26} />
            </div>
          ))}
        </div>
      ))}
    </Card>
  );
}
