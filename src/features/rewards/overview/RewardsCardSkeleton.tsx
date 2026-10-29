import React from 'react';

import {
  Card,
  Hero,
  Skeleton,
} from '@/components/ds';
import { REWARDS_HREF } from '@/features/rewards/overview/rewardsTabs';
import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

/** A card's rewards page while it loads: the top bar, then the hero and the lines. */
export function RewardsCardSkeleton() {
  return (
    <ShellPage crumb={subCrumb('rewards')} title="Rewards" backHref={REWARDS_HREF}>
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <Skeleton width={240} height={40} />
        <Hero.Skeleton label change figures={3} />
        <Card>
          <div className="p-space-16 flex flex-col gap-space-8 desk:gap-space-12">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} height={16} />
            ))}
          </div>
        </Card>
      </div>
    </ShellPage>
  );
}
