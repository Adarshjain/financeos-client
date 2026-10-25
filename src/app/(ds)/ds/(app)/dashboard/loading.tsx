import React from 'react';

import { Skeleton } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';

/** Home while it loads: the greeting, then rows of widgets. */
export default function DsHomeLoading() {
  return (
    <ShellPage title="Home">
      <div className="flex flex-col gap-space-16">
        <Skeleton height={48} width="40%" />
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
