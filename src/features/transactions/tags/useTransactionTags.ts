'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React from 'react';

import { showToast } from '@/components/ds/Toast/Toast';
import type { Account } from '@/lib/account.types';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { keys } from '@/lib/query/keys';
import type { Tag } from '@/lib/tags.types';
import type { Transaction } from '@/lib/transaction.types';

import { patchChange } from '../optimistic/optimisticModel';
import { useOptimisticTransactions } from '../optimistic/OptimisticTransactions';
import { updateTransaction } from '../transactionActions';
import { bulkAddTags } from './tagActions';
import { bulkAddedMessage, tagsRequest } from './tagsModel';

/**
 * Changes the tags on transactions. `setTags` replaces one transaction's tags: the row shows them at once and the save
 * finishes behind it (a failure puts the old ones back). `addTags` puts tags on several transactions at once.
 */
export function useTransactionTags(accounts: readonly Account[] | null) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const optimistic = useOptimisticTransactions();

  const refresh = React.useCallback(
    (ids: readonly string[]) => {
      for (const id of ids) void queryClient.invalidateQueries({ queryKey: keys.transactions.byId(id) });
      void queryClient.invalidateQueries({ queryKey: keys.tags.all });
      router.refresh();
    },
    [queryClient, router],
  );

  const setTags = React.useCallback(
    async (transaction: Transaction, tags: Tag[]): Promise<boolean> => {
      const handle = optimistic?.begin(patchChange(transaction.id, { tags }));
      const request = () =>
        unwrapAction(
          updateTransaction(
            transaction.id,
            tagsRequest(handle?.base(transaction.id) ?? transaction, tags.map((t) => t.id), accounts),
          ),
        );
      try {
        await (handle ? handle.send(request) : request());
        handle?.settle(true);
        refresh([transaction.id]);
        return true;
      } catch (e) {
        handle?.settle(false);
        showToast(getErrorMessage(e, "Couldn't save the tags. Try again."), { tone: 'danger' });
        return false;
      }
    },
    [optimistic, accounts, refresh],
  );

  const addTags = React.useCallback(
    async (transactions: readonly Pick<Transaction, 'id'>[], tags: Tag[]): Promise<boolean> => {
      try {
        await unwrapAction(bulkAddTags(transactions.map((t) => t.id), tags.map((t) => t.id)));
        showToast(bulkAddedMessage(tags, transactions.length));
        refresh(transactions.map((t) => t.id));
        return true;
      } catch (e) {
        showToast(getErrorMessage(e, "Couldn't add the tags. Try again."), { tone: 'danger' });
        return false;
      }
    },
    [refresh],
  );

  return { setTags, addTags };
}
