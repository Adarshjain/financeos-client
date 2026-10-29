import React from 'react';

import { Card, ListRow, Skeleton } from '@/components/ds';
import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

/** The Rules tab while the rules load. */
export function RulesSkeleton() {
  return (
    <ShellPage crumb={subCrumb('transactions')} title="Rules" flushTop>
      <div className="grid grid-cols-1 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12 desk:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i}>
            <ListRow title={<Skeleton width="40%" />} subtitle={<Skeleton width="60%" />} />
          </Card>
        ))}
      </div>
    </ShellPage>
  );
}
