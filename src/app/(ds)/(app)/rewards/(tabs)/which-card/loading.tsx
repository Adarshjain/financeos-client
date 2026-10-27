import React from 'react';

import { Card, Skeleton } from '@/components/ds';

/** The tab's shape: the line under the tabs, the form, then the ranked cards. */
export default function DsWhichCardLoading() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Skeleton width="60%" height={16} />
      <Card>
        <div className="p-space-16 flex flex-col gap-space-8 desk:gap-space-12">
          <Skeleton height={40} />
          <Skeleton height={16} width="20%" />
        </div>
      </Card>
      <Card>
        <div className="p-space-16 flex flex-col gap-space-8 desk:gap-space-12">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} height={16} />
          ))}
        </div>
      </Card>
    </div>
  );
}
