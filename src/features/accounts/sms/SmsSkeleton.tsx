import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';

/** The SMS sync page while it loads. */
export function SmsSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <div className="flex flex-col gap-space-8 p-space-16">
            <Skeleton width={160} height={20} />
            <Skeleton width={240} height={14} />
            <Skeleton width={200} height={14} />
          </div>
        </Card>
      ))}
    </div>
  );
}
