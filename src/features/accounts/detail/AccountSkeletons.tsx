import React from 'react';

import {
  Card,
  GRID_GAP,
  Skeleton,
} from '@/components/ds';

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="px-space-16 pb-space-16 flex flex-col gap-space-8 desk:gap-space-12">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={16} />
      ))}
    </div>
  );
}

function SkeletonCard({ rows }: { rows: number }) {
  return (
    <Card>
      <div className="p-space-16">
        <Skeleton width="40%" height={16} />
      </div>
      <SkeletonRows count={rows} />
    </Card>
  );
}

/** The card Overview's shape: header card, two columns of cards, then the table. */
export function AccountOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Card>
        <div className="p-space-16 flex flex-col gap-space-8">
          <Skeleton width={80} height={12} />
          <Skeleton width={160} height={32} />
          <Skeleton width={220} height={12} />
        </div>
      </Card>
      <div className={`grid grid-cols-1 desk:grid-cols-12 items-start ${GRID_GAP}`}>
        <div className="desk:col-span-7 flex flex-col gap-space-8 desk:gap-space-16">
          <SkeletonCard rows={3} />
          <SkeletonCard rows={3} />
        </div>
        <div className="desk:col-span-5 flex flex-col gap-space-8 desk:gap-space-16">
          <SkeletonCard rows={2} />
        </div>
      </div>
      <SkeletonCard rows={6} />
    </div>
  );
}

function SkeletonHolder() {
  return (
    <Card>
      <div className="p-space-16 flex flex-col gap-space-8 desk:gap-space-12">
        <Skeleton width="50%" height={16} />
        <Skeleton height={32} />
        <Skeleton height={16} />
        <Skeleton height={16} />
      </div>
    </Card>
  );
}

/** The Cards tab's shape: two cardholder cards side by side, then the shared limit. */
export function AccountCardsSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <div className={`grid grid-cols-1 desk:grid-cols-2 items-start ${GRID_GAP}`}>
        <SkeletonHolder />
        <SkeletonHolder />
      </div>
      <Card>
        <div className="p-space-16 flex flex-col gap-space-8">
          <Skeleton width="30%" height={16} />
          <Skeleton height={16} />
        </div>
      </Card>
    </div>
  );
}

function RewardsCard({ rows }: { rows: number }) {
  return (
    <Card>
      <div className="p-space-16 flex flex-col gap-space-8 desk:gap-space-12">
        <Skeleton width="40%" height={16} />
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} height={16} />
        ))}
      </div>
    </Card>
  );
}

/** The Rewards tab's shape: four tiles, then the earning lines beside the milestone and rules. */
export function AccountRewardsSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <div className={`grid grid-cols-2 desk:grid-cols-4 ${GRID_GAP}`}>
        {Array.from({ length: 4 }, (_, i) => (
          <RewardsCard key={i} rows={1} />
        ))}
      </div>
      <div className={`grid grid-cols-1 desk:grid-cols-12 items-start ${GRID_GAP}`}>
        <div className="desk:col-span-7">
          <RewardsCard rows={8} />
        </div>
        <div className="desk:col-span-5 flex flex-col gap-space-8 desk:gap-space-16">
          <RewardsCard rows={3} />
          <RewardsCard rows={3} />
        </div>
      </div>
    </div>
  );
}

/** The Statements tab's shape: the list on the left, the selected statement on the right. */
export function AccountStatementsSkeleton() {
  return (
    <div className={`grid grid-cols-1 desk:grid-cols-12 items-start ${GRID_GAP}`}>
      <div className="desk:col-span-5">
        <SkeletonCard rows={3} />
      </div>
      <div className="desk:col-span-7">
        <SkeletonCard rows={8} />
      </div>
    </div>
  );
}
