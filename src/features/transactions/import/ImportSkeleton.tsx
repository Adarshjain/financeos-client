import React from 'react';

import { Card, Skeleton } from '@/components/ds';
import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

import { TransactionsTabs } from '../TransactionsTabs';

/** The Import tab while it loads: the tabs, the form card and the side card. */
export function ImportSkeleton() {
  return (
    <ShellPage crumb={subCrumb('transactions', 'Import')} title="Import" flushTop>
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <TransactionsTabs />
        <div className="grid grid-cols-1 gap-x-space-12 gap-y-space-8 desk:grid-cols-12 desk:gap-space-16">
          <Card className="desk:col-span-7">
            <div className="flex flex-col gap-space-8 desk:gap-space-12 p-space-16">
              <Skeleton height={36} />
              <Skeleton height={160} />
            </div>
          </Card>
          <Card className="desk:col-span-5">
            <div className="flex flex-col gap-space-8 desk:gap-space-12 p-space-16">
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
