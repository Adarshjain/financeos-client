import React from 'react';

import {
  Card,
  Figures,
  GRID_GAP,
  Hero,
  Skeleton,
} from '@/components/ds';
import { HOLDINGS_HREF } from '@/features/investments/investmentsTabs';
import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

function SkeletonCard({ rows }: { rows: number }) {
  return (
    <Card>
      <div className="p-space-16">
        <Skeleton width="40%" height={16} />
      </div>
      <div className="px-space-16 pb-space-16 flex flex-col gap-space-8 desk:gap-space-12">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} height={16} />
        ))}
      </div>
    </Card>
  );
}

/** The holding page's shape: the header, the hero, then the sections in two columns. */
export function HoldingSkeleton() {
  return (
    <ShellPage crumb={subCrumb('investments')} title="Holding" backHref={HOLDINGS_HREF} flushTop>
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <div className="flex items-center justify-between gap-space-12">
          <div className="flex items-center gap-space-12">
            <Skeleton className="h-control-md w-control-md rounded-ds-md" />
            <Skeleton width={160} height={16} />
          </div>
          <Skeleton className="h-control-md w-space-96 rounded-ds-md" />
        </div>
        <Hero.Skeleton label change figures={3} />
        <Card>
          <div className="p-space-16">
            <Skeleton width="40%" height={16} />
          </div>
          <div className="px-space-16 pb-space-16">
            <Figures.Skeleton count={5} size="sm" />
          </div>
        </Card>
        <div className={`grid grid-cols-1 desk:grid-cols-12 items-start ${GRID_GAP}`}>
          <div className="desk:col-span-8 flex flex-col gap-space-8 desk:gap-space-16">
            <SkeletonCard rows={4} />
            <SkeletonCard rows={3} />
          </div>
          <div className="desk:col-span-4 flex flex-col gap-space-8 desk:gap-space-16">
            <SkeletonCard rows={2} />
            <SkeletonCard rows={3} />
          </div>
        </div>
      </div>
    </ShellPage>
  );
}
