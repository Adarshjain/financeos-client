import React from 'react';

import { Card, ListRow, Skeleton } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';

/** Shown while the rules load. */
export default function DsRulesLoading() {
  return (
    <ShellPage crumb="Money / Transactions" title="Rules" flushTop>
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
