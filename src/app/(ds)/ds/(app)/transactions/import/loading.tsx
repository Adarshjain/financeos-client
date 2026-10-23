import React from 'react';

import { Card, Skeleton } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';
import { ImportTabs } from '@/features/transactions/import/ImportTabs';

/** Shown while the Import tab loads. */
export default function DsImportLoading() {
  return (
    <ShellPage crumb="Money / Transactions" title="Import">
      <div className="flex flex-col gap-space-12 desk:gap-space-16">
        <Skeleton width="60%" height={16} />
        <ImportTabs />
        <div className="grid grid-cols-1 gap-space-12 desk:grid-cols-12 desk:gap-space-16">
          <Card className="desk:col-span-7">
            <div className="flex flex-col gap-space-12 p-space-16">
              <Skeleton height={36} />
              <Skeleton height={160} />
            </div>
          </Card>
          <Card className="desk:col-span-5">
            <div className="flex flex-col gap-space-12 p-space-16">
              <Skeleton width="40%" height={16} />
              <Skeleton height={16} />
              <Skeleton height={16} />
            </div>
          </Card>
        </div>
      </div>
    </ShellPage>
  );
}
