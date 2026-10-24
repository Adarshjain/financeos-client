import React from 'react';

import { Card, Skeleton } from '@/components/ds';
import { REPORTS_HREF } from '@/features/reports/list/reportsList';
import { ShellPage } from '@/features/shell/ShellPage';

/** The editor's shape while it loads: the name, then the configuration card beside the preview card. */
export function ReportEditorSkeleton({ title }: { title: string }) {
  return (
    <ShellPage crumb="Insights / Reports" title={title} backHref={REPORTS_HREF}>
      <div className="flex flex-col gap-space-12 desk:gap-space-16">
        <Skeleton height={44} width="60%" />
        <div className="grid grid-cols-1 desk:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] items-start gap-space-12 desk:gap-space-16">
          <Card>
            <div className="flex flex-col gap-space-12 p-space-16">
              <Skeleton height={12} width="30%" />
              <Skeleton height={32} />
              <Skeleton height={12} width="30%" />
              <Skeleton height={32} />
              <Skeleton height={32} />
              <Skeleton height={32} />
            </div>
          </Card>
          <Card>
            <div className="flex flex-col gap-space-12 p-space-16">
              <Skeleton height={16} width="20%" />
              <Skeleton height={200} />
            </div>
          </Card>
        </div>
      </div>
    </ShellPage>
  );
}
