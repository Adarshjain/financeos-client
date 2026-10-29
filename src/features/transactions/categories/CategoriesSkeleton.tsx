import React from 'react';

import { Card, ListRow, Skeleton } from '@/components/ds';
import { areaCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

/** The Categories tab while the categories load. */
export function CategoriesSkeleton() {
  return (
    <ShellPage crumb={areaCrumb('transactions')} title="Categories" flushTop>
      <Card>
        {Array.from({ length: 8 }, (_, i) => (
          <ListRow key={i} title={<Skeleton width="40%" />} />
        ))}
      </Card>
    </ShellPage>
  );
}
