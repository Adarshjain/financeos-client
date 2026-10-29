import React from 'react';

import { Skeleton } from '@/components/ds';

/** The loading shape of a list's filter row: the search field, then `chips` filter chips. Same row gap as FilterBar. */
export function FilterRowSkeleton({ chips = 2 }: { chips?: number }) {
  return (
    <div className="flex items-center gap-space-8">
      <Skeleton className="h-control-md rounded-ds-pill w-space-96 desk:w-container-xs" />
      {Array.from({ length: chips }, (_, i) => (
        <Skeleton key={i} className="h-space-28 w-space-96 rounded-ds-pill" />
      ))}
    </div>
  );
}
