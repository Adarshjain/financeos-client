import React from 'react';

import { Skeleton } from '@/components/ds/Skeleton/Skeleton';

export default function DsSettingsFailuresLoading() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Skeleton height={20} width="30%" />
      <Skeleton height={16} width="50%" />
      <Skeleton height={120} />
    </div>
  );
}
