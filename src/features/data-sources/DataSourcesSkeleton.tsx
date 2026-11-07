import React from 'react';

import { SkeletonCard } from '@/features/settings/SkeletonCard';

/** Shown inside the Data sources shell while the main page loads. */
export function DataSourcesSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <SkeletonCard rows={3} />
    </div>
  );
}
