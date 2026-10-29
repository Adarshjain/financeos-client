import React from 'react';

import {
  GRID_GAP,
  Skeleton,
} from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';

/** Home while it loads: rows of widgets. */
export function HomeSkeleton() {
  return (
    <ShellPage title="Home">
      <div className={`grid grid-cols-1 desk:grid-cols-12 ${GRID_GAP}`}>
        <Skeleton height={120} className="desk:col-span-6" />
        <Skeleton height={120} className="desk:col-span-3" />
        <Skeleton height={120} className="desk:col-span-3" />
        <Skeleton height={160} className="desk:col-span-12" />
      </div>
    </ShellPage>
  );
}
