import React from 'react';

import { Skeleton } from '@/components/ds';

/** Card rows: a name over its due line, the amount and a button at the end. */
export function BillsDueSkeleton() {
  return (
    <div data-testid="bills-widget-loading">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-space-12 px-space-16 py-space-10">
          <div className="flex flex-1 flex-col gap-space-6">
            <Skeleton width="55%" height={14} />
            <Skeleton width="35%" height={12} />
          </div>
          <Skeleton width={56} height={14} />
          <Skeleton width={64} height={26} />
        </div>
      ))}
    </div>
  );
}
