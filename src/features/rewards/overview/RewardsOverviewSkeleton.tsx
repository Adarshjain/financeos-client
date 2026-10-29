import React from 'react';

import { Card, Hero, Skeleton } from '@/components/ds';

/** The overview's shape: the hero, then the card list. */
export function RewardsOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Hero.Skeleton label change />
      <Card>
        <div className="p-space-16 flex flex-col gap-space-8 desk:gap-space-12">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} height={16} />
          ))}
        </div>
      </Card>
    </div>
  );
}
