import React from 'react';

import { Skeleton } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';

import { DASHBOARDS_CRUMB, DASHBOARDS_HREF } from '../routes';

/** A dashboard's shape while it loads: the count line, then rows of widgets. */
export function DashboardSkeleton({ title }: { title: string }) {
  return (
    <ShellPage crumb={DASHBOARDS_CRUMB} title={title} backHref={DASHBOARDS_HREF}>
      <div className="flex flex-col gap-space-16">
        <Skeleton height={16} width="20%" />
        <div className="grid grid-cols-2 desk:grid-cols-12 gap-space-12 desk:gap-space-16">
          <Skeleton height={120} className="col-span-2 desk:col-span-6" />
          <Skeleton height={120} className="col-span-1 desk:col-span-3" />
          <Skeleton height={120} className="col-span-1 desk:col-span-3" />
          <Skeleton height={160} className="col-span-2 desk:col-span-12" />
        </div>
      </div>
    </ShellPage>
  );
}
