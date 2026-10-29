import React from 'react';

import { HeroBlockSkeleton } from '@/features/loans/HeroBlock';

import { LendingsListSkeleton } from './LendingsListCard';

/** The Lendings tab while it loads: the hero and the list. */
export function LendingsSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <HeroBlockSkeleton />
      <LendingsListSkeleton />
    </div>
  );
}
