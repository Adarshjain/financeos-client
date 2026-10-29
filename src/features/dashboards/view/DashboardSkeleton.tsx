import React from 'react';

import {
  GRID_GAP,
  Skeleton,
} from '@/components/ds';
import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

import { DASHBOARDS_HREF } from '../routes';

/** A dashboard's shape while it loads: the header (facts, actions), then rows of widgets. */
export function DashboardSkeleton({ title }: { title: string }) {
  return (
    <ShellPage crumb={subCrumb('dashboards')} title={title} backHref={DASHBOARDS_HREF}>
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <div className="flex items-center justify-between gap-space-12">
          <Skeleton height={16} width="20%" />
          <Skeleton height={32} width={96} />
        </div>
        <div className={`grid grid-cols-2 desk:grid-cols-12 ${GRID_GAP}`}>
          <Skeleton height={120} className="col-span-2 desk:col-span-6" />
          <Skeleton height={120} className="col-span-1 desk:col-span-3" />
          <Skeleton height={120} className="col-span-1 desk:col-span-3" />
          <Skeleton height={160} className="col-span-2 desk:col-span-12" />
        </div>
      </div>
    </ShellPage>
  );
}
