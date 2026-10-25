import React from 'react';

import { Skeleton } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';

/** Home while it loads: rows of widgets. */
export default function DsHomeLoading() {
  return (
    <ShellPage title="Home">
      <div className="grid grid-cols-1 desk:grid-cols-12 gap-space-12 desk:gap-space-16">
        <Skeleton height={120} className="desk:col-span-6" />
        <Skeleton height={120} className="desk:col-span-3" />
        <Skeleton height={120} className="desk:col-span-3" />
        <Skeleton height={160} className="desk:col-span-12" />
      </div>
    </ShellPage>
  );
}
