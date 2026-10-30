import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { TRADEBOOK_HREF } from '@/features/investments/tradebook/tradebookModel';
import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

/** The Import tradebook page while it loads: the step card, then the form. */
export function ImportTradebookSkeleton() {
  return (
    <ShellPage crumb={subCrumb('investments')} title="Import tradebook" backHref={TRADEBOOK_HREF}>
      <div className="mx-auto flex max-w-container-md flex-col gap-space-8 desk:gap-space-16">
        <Card>
          <div className="flex flex-col gap-space-8 desk:gap-space-12 p-space-16 desk:p-space-20">
            <Skeleton width="40%" height={16} />
            <Skeleton height={24} />
          </div>
        </Card>
        <Card>
          <div className="flex flex-col gap-space-8 desk:gap-space-12 p-space-16 desk:p-space-20">
            <Skeleton height={36} />
            <Skeleton height={160} />
          </div>
        </Card>
      </div>
    </ShellPage>
  );
}
