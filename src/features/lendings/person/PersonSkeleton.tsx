import React from 'react';

import {
  Card,
  GRID_GAP,
  Hero,
  Skeleton,
} from '@/components/ds';
import { LENDINGS_HREF } from '@/features/loans/loansLendingsTabs';
import { DetailLoadingTitle } from '@/features/shell/DetailLoadingTitle';
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

/** The person page's shape: who they are, the hero, then the ledger beside three cards. */
export function PersonSkeleton() {
  return (
    <ShellPage crumb={subCrumb('lendings')} title={<DetailLoadingTitle kind="person">Person</DetailLoadingTitle>} backHref={LENDINGS_HREF}>
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <Skeleton width="60%" height={20} />
        <Hero.Skeleton label />
        <div className={`grid grid-cols-1 desk:grid-cols-12 items-start ${GRID_GAP}`}>
          <div className="desk:col-span-7">
            <SkeletonCard rows={6} />
          </div>
          <div className="desk:col-span-5 flex flex-col gap-space-8 desk:gap-space-16">
            <SkeletonCard rows={2} />
            <SkeletonCard rows={2} />
            <SkeletonCard rows={2} />
          </div>
        </div>
      </div>
    </ShellPage>
  );
}
