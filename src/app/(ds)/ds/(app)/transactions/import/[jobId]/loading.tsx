import React from 'react';

import { Card, Skeleton } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';
import { IMPORT_HREF } from '@/features/transactions/import/importModel';

export default function DsImportJobLoading() {
  return (
    <ShellPage crumb="Money / Import" title="Import result" backHref={IMPORT_HREF}>
      <Card>
        <div className="flex flex-col gap-space-8 p-space-16">
          <Skeleton width="40%" height={16} />
          <Skeleton width="60%" height={12} />
        </div>
      </Card>
    </ShellPage>
  );
}
