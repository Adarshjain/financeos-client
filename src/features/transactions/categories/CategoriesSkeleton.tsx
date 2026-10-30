'use client';

import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { FilterBar } from '@/components/ds/FilterBar/FilterBar';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

import { TransactionsTabs } from '../TransactionsTabs';

const noop = () => {};

/** The Categories tab while the categories load. */
export function CategoriesSkeleton() {
  return (
    <ShellPage crumb={subCrumb('transactions')} title="Categories" flushTop>
      <div className="flex min-w-0 flex-col gap-space-8 desk:gap-space-16">
        <TransactionsTabs />
        <FilterBar search={{ value: '', onValueChange: noop }} />
        <Card>
          {Array.from({ length: 8 }, (_, i) => (
            <ListRow key={i} title={<Skeleton width="40%" />} />
          ))}
        </Card>
      </div>
    </ShellPage>
  );
}
