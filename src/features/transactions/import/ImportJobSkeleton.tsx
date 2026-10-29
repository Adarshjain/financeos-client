import React from 'react';

import { Card, Skeleton } from '@/components/ds';
import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

import { IMPORT_HREF } from './importModel';

/** One import's page while it loads. */
export function ImportJobSkeleton() {
  return (
    <ShellPage crumb={subCrumb('transactions', 'Import')} title="Import result" backHref={IMPORT_HREF}>
      <Card>
        <div className="flex flex-col gap-space-8 p-space-16">
          <Skeleton width="40%" height={16} />
          <Skeleton width="60%" height={12} />
        </div>
      </Card>
    </ShellPage>
  );
}
