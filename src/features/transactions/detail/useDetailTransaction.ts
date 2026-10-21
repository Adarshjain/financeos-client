'use client';

import { useQuery } from '@tanstack/react-query';

import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';

import { fetchTransaction } from './transactionDetailApi';

/**
 * The transaction the detail shows. One on the open page is read from the page (so it follows
 * router.refresh); any other (opened from a link) is fetched while the panel is open. The server's single
 * transaction has the same links and records as a list row, but no running balance (so no "after" line).
 */
export function useDetailTransaction(id: string | null, open: boolean, pageTransactions: readonly Transaction[]) {
  const fromPage = id ? pageTransactions.find((t) => t.id === id) : undefined;
  const query = useQuery({
    queryKey: keys.transactions.byId(id ?? ''),
    queryFn: () => fetchTransaction(id as string),
    // Only while open: a deleted or filtered-away transaction is not read again while the panel slides shut.
    enabled: open && id !== null && !fromPage,
  });
  const transaction = fromPage ?? query.data;
  return {
    transaction,
    loading: open && id !== null && !transaction && !query.isError,
    failed: open && id !== null && !transaction && query.isError,
    retry: () => void query.refetch(),
  };
}
