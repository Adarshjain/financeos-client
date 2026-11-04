import React from 'react';

import { SkeletonCard } from '@/features/settings/SkeletonCard';

/** Shown inside the Settings shell while the main page loads; one column of cards like the page. */
export function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <SkeletonCard rows={2} />
      <SkeletonCard rows={2} />
      <SkeletonCard rows={2} />
      <SkeletonCard rows={2} />
      <SkeletonCard rows={3} />
    </div>
  );
}
