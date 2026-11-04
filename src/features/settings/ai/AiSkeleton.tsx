import React from 'react';

import { SkeletonCard } from '@/features/settings/SkeletonCard';

/** Shown inside the Settings shell while the AI tab loads. */
export function AiSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <SkeletonCard rows={4} />
        <SkeletonCard rows={2} />
      <SkeletonCard rows={4} />
    </div>
  );
}
