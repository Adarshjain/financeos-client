import React from 'react';

import { ShellPage } from '@/features/shell/ShellPage';
import { TransactionsListSkeleton } from '@/features/transactions/list/TransactionsList';

/** Shown while the list loads. */
export default function DsTransactionsLoading() {
  return (
    <ShellPage crumb="Money" title="Transactions" flushTop>
      <TransactionsListSkeleton />
    </ShellPage>
  );
}
