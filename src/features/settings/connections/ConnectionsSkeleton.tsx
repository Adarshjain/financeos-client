import React from 'react';

import { SkeletonCard } from '@/features/settings/SkeletonCard';

/** Shown inside the Settings shell while Connections loads. */
export function ConnectionsSkeleton() {
  return (
    <div className="grid grid-cols-1 desk:grid-cols-12 items-start gap-x-space-12 gap-y-space-8 desk:gap-space-16">
      <div className="desk:col-span-7 flex flex-col gap-space-8 desk:gap-space-16">
        <SkeletonCard rows={2} />
        <SkeletonCard rows={3} />
        <SkeletonCard rows={3} />
      </div>
      <div className="desk:col-span-5">
        <SkeletonCard rows={3} />
      </div>
    </div>
  );
}
