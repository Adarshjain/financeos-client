import React from 'react';

import { Card, ListRow, Skeleton } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';

/** Shown while the categories load. */
export default function DsCategoriesLoading() {
  return (
    <ShellPage crumb="Money" title="Categories" flushTop>
      <Card>
        {Array.from({ length: 8 }, (_, i) => (
          <ListRow key={i} title={<Skeleton width="40%" />} />
        ))}
      </Card>
    </ShellPage>
  );
}
