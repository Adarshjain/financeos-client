import React from 'react';

import { TransactionsSkeleton } from '@/features/transactions/list/TransactionsSkeleton';

/** Shown while the list loads. */
export default function DsTransactionsLoading() {
  return <TransactionsSkeleton />;
}
