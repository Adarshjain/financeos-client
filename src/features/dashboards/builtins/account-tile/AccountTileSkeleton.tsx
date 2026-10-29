import React from 'react';

import { Skeleton } from '@/components/ds';

/** The account name, the label and the figure. */
export function AccountTileSkeleton() {
  return (
    <div className="flex flex-col gap-space-6" data-testid="widget-skeleton">
      <Skeleton width="50%" height={14} />
      <Skeleton width="30%" height={10} />
      <Skeleton width="70%" height={22} />
    </div>
  );
}
