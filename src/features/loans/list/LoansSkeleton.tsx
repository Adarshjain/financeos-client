import React from 'react';

import { HeroBlockSkeleton } from '../HeroBlock';
import { LoansListSkeleton } from './LoansListCard';

/** The Loans tab while it loads: the hero and the list. */
export function LoansSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <HeroBlockSkeleton />
      <LoansListSkeleton />
    </div>
  );
}
