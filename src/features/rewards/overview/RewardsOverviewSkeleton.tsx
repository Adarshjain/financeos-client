import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { Hero } from '@/components/ds/Hero/Hero';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';

/** The overview's shape: the hero, then the card list. */
export function RewardsOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Hero.Skeleton label />
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
