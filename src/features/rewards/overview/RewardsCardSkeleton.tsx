import React from 'react';

import { Card, Skeleton } from '@/components/ds';
import { REWARDS_HREF } from '@/features/rewards/overview/rewardsTabs';
import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

/** A card's rewards page while it loads: the top bar, then the tiles and the lines. */
export function RewardsCardSkeleton() {
  return (
    <ShellPage crumb={subCrumb('rewards')} title="Rewards" backHref={REWARDS_HREF}>
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <div className="grid grid-cols-2 desk:grid-cols-4 gap-x-space-12 gap-y-space-8 desk:gap-space-16">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i}>
              <div className="p-space-16 flex flex-col gap-space-8 desk:gap-space-12">
                <Skeleton width="40%" height={16} />
                <Skeleton height={16} />
              </div>
            </Card>
          ))}
        </div>
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
