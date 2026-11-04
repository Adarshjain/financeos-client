import React from 'react';

import { SkeletonCard } from '@/features/settings/SkeletonCard';

/** Shown inside the Settings shell while Profile loads; one column like the screen. */
export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <SkeletonCard rows={2} />
      <SkeletonCard rows={2} />
    </div>
  );
}
