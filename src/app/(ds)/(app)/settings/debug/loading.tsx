import React from 'react';

import { Card, Skeleton } from '@/components/ds';

/** Shown inside the Settings shell while the Debug tab loads. */
export default function DsSettingsDebugLoading() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Card>
        <div className="p-space-16">
          <Skeleton height={32} />
        </div>
      </Card>
      <Card>
        <div className="p-space-16 flex flex-col gap-space-8 desk:gap-space-12">
          <Skeleton width="40%" height={16} />
          <Skeleton height={16} />
          <Skeleton height={16} />
        </div>
      </Card>
    </div>
  );
}
