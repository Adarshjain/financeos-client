import React from 'react';

import { SkeletonCard } from '@/features/settings/SkeletonCard';

/** Shown inside the Settings shell while Connections loads. */
export function ConnectionsSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <SkeletonCard rows={2} />
        <SkeletonCard rows={3} />
        <SkeletonCard rows={3} />
      <SkeletonCard rows={3} />
    </div>
  );
}
