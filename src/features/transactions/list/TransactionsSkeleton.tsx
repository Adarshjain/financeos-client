import React from 'react';

import { areaCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

import { TransactionsListSkeleton } from './TransactionsList';

/** Transactions while the list loads: the app bar and the list skeleton. */
export function TransactionsSkeleton() {
  return (
    <ShellPage crumb={areaCrumb('transactions')} title="Transactions" flushTop>
      <TransactionsListSkeleton />
    </ShellPage>
  );
}
