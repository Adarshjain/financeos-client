import React from 'react';

import { Skeleton } from '@/components/ds';

/** Rows of a title over a context line, with a button at the end. */
export function AttentionSkeleton() {
  return (
    <div data-testid="inbox-widget-loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-space-12 px-space-16 py-space-10">
          <div className="flex flex-1 flex-col gap-space-6">
            <Skeleton width="60%" height={14} />
            <Skeleton width="40%" height={12} />
          </div>
          <Skeleton width={56} height={26} />
        </div>
      ))}
    </div>
  );
}
