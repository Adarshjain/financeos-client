import React from 'react';

import { Card, Skeleton } from '@/components/ds';
import { TRADEBOOK_HREF } from '@/features/investments/tradebook/tradebookModel';
import { ShellPage } from '@/features/shell/ShellPage';

/** Shown while the Import tradebook page loads: the step card, then the form. */
export default function DsInvestmentsImportLoading() {
  return (
    <ShellPage crumb="Grow / Investments" title="Import tradebook" backHref={TRADEBOOK_HREF}>
      <div className="mx-auto flex max-w-container-xl flex-col gap-space-8 desk:gap-space-16">
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
