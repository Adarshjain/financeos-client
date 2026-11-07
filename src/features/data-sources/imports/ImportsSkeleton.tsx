import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';

/** Shown inside the Data sources shell while Imports loads. */
export function ImportsSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Skeleton width={96} height={32} />
      <Card>
        <div className="p-space-16 flex flex-col gap-space-8 desk:gap-space-12">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={16} />
          ))}
        </div>
      </Card>
    </div>
  );
}
