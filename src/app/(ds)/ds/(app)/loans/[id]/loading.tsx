import React from 'react';

import { Card, Skeleton } from '@/components/ds';
import { appHref } from '@/features/shell/routes';
import { ShellPage } from '@/features/shell/ShellPage';

function SkeletonCard({ rows }: { rows: number }) {
  return (
    <Card>
      <div className="p-space-16">
        <Skeleton width="40%" height={16} />
      </div>
      <div className="px-space-16 pb-space-16 flex flex-col gap-space-12">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} height={16} />
        ))}
      </div>
    </Card>
  );
}

/** The loan page's shape: the particulars line, the figures, then the schedule beside two cards. */
export default function DsLoanLoading() {
  return (
    <ShellPage crumb="Owe & lend / Loans" title="Loan" backHref={appHref('/loans')}>
      <div className="flex flex-col gap-space-12 desk:gap-space-16">
        <Skeleton width="60%" height={20} />
        <Card>
          <div className="p-space-16 flex flex-col gap-space-8">
            <Skeleton width={80} height={12} />
            <Skeleton width={160} height={32} />
            <Skeleton width="100%" height={8} />
          </div>
        </Card>
        <div className="grid grid-cols-1 desk:grid-cols-12 items-start gap-space-12 desk:gap-space-16">
          <div className="desk:col-span-9">
            <SkeletonCard rows={8} />
          </div>
          <div className="desk:col-span-3 flex flex-col gap-space-12 desk:gap-space-16">
            <SkeletonCard rows={3} />
            <SkeletonCard rows={2} />
          </div>
        </div>
      </div>
    </ShellPage>
  );
}
