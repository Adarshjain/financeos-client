import React from 'react';

import { Card, Skeleton } from '@/components/ds';

/** Shown inside the Settings shell while Activity loads. */
export default function DsSettingsActivityLoading() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <div className="flex gap-space-8">
        <Skeleton width={120} height={32} />
        <Skeleton width={100} height={32} />
      </div>
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
