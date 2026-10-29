import React from 'react';

import { GRID_GAP } from '@/components/ds';
import { SkeletonCard } from '@/features/settings/SkeletonCard';

/** Shown inside the Settings shell while the AI tab loads. */
export function AiSkeleton() {
  return (
    <div className={`grid grid-cols-1 desk:grid-cols-12 items-start ${GRID_GAP}`}>
      <div className="desk:col-span-7 flex flex-col gap-space-8 desk:gap-space-16">
        <SkeletonCard rows={4} />
        <SkeletonCard rows={2} />
      </div>
      <div className="desk:col-span-5">
        <SkeletonCard rows={4} />
      </div>
    </div>
  );
}
