'use client';

import React from 'react';

import { FilterBar } from '@/components/ds/FilterBar/FilterBar';
import { FilterChip } from '@/components/ds/FilterChip/FilterChip';
import { areaCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

import { TransactionsTabs } from '../TransactionsTabs';
import { TransactionsListSkeleton } from './TransactionsList';

const noop = () => {};

/** Transactions while the list loads: the same frame as the loaded page (app bar, tabs, filter row) with the list skeleton under it. */
export function TransactionsSkeleton() {
  return (
    <ShellPage crumb={areaCrumb('transactions')} title="Transactions" flushTop>
      <div className="flex">
        <div className="flex min-w-0 flex-1 flex-col gap-space-8 desk:gap-space-16">
          <TransactionsTabs />
          <FilterBar size="md" search={{ value: '', onValueChange: noop }}>
            <FilterChip size="md" className="shrink-0" hasDropdown disabled>
              Period
            </FilterChip>
            <FilterChip size="md" className="shrink-0" hasDropdown disabled>
              Account
            </FilterChip>
            <FilterChip size="md" className="shrink-0 desk:hidden" disabled>
              All filters
            </FilterChip>
            <FilterChip size="md" className="shrink-0 max-desk:hidden" hasDropdown disabled>
              Category
            </FilterChip>
            <FilterChip size="md" variant="dashed" className="shrink-0 max-desk:hidden" disabled>
              + More
            </FilterChip>
            <FilterChip size="md" className="shrink-0 ml-auto max-desk:hidden" hasDropdown disabled>
              Newest
            </FilterChip>
          </FilterBar>
          <TransactionsListSkeleton />
        </div>
      </div>
    </ShellPage>
  );
}
