import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';

/** The Earning rules tab's shape: the card picker, the rules, caps and milestones, the settings. */
export function RewardRulesSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Skeleton height={36} className="desk:w-container-xs" />
      {[4, 2, 2].map((rows, i) => (
        <Card key={i}>
          <div className="p-space-16 flex flex-col gap-space-8 desk:gap-space-12">
            {Array.from({ length: rows }, (_, j) => (
              <Skeleton key={j} height={16} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
