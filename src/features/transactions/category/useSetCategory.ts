'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React from 'react';

import { showToast } from '@/components/ds/Toast/Toast';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { CategoryDef, CategoryPick } from '@/lib/categoryList.types';
import { keys } from '@/lib/query/keys';
import type { SetCategoryResponse, Transaction } from '@/lib/transaction.types';

import { patchChange } from '../optimistic/optimisticModel';
import { useOptimisticTransactions } from '../optimistic/OptimisticTransactions';
import { setTransactionCategory } from '../transactionActions';
import { categoryPatch, savedMessage } from './categoryModel';

/**
 * Sets a transaction's category: the row shows it at once and the save finishes behind it (a failure puts the old one back).
 * The toast says "Set to Food · Delivery" with Undo, which sends the response's `previous` back as `restore`.
 */
export function useSetCategory(list: readonly CategoryDef[]) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const optimistic = useOptimisticTransactions();

  const send = React.useCallback(
    async (
      transaction: Pick<Transaction, 'id'>,
      body: Parameters<typeof setTransactionCategory>[1],
      shown: Partial<Transaction>,
    ): Promise<SetCategoryResponse | null> => {
      const handle = optimistic?.begin(patchChange(transaction.id, shown));
      const request = () => unwrapAction(setTransactionCategory(transaction.id, body));
      try {
        const response = await (handle ? handle.send(request) : request());
        handle?.settle(true);
        void queryClient.invalidateQueries({ queryKey: keys.transactions.byId(transaction.id) });
        router.refresh();
        return response;
      } catch (e) {
        handle?.settle(false);
        showToast(getErrorMessage(e, "Couldn't set the category. Try again."), { tone: 'danger' });
        return null;
      }
    },
    [optimistic, queryClient, router],
  );

  /** Puts a category on the transaction. */
  const setCategory = React.useCallback(
    async (transaction: Pick<Transaction, 'id'>, pick: CategoryPick) => {
      const response = await send(
        transaction,
        { categoryKey: pick.categoryKey, subcategoryKey: pick.subcategoryKey },
        categoryPatch(list, pick, 'USER', new Date().toISOString()),
      );
      if (!response) return;
      const before = response.previous;
      showToast(savedMessage(list, pick), {
        action: {
          label: 'Undo',
          onSelect: () => {
            const was: CategoryPick | null = before.categoryKey
              ? { categoryKey: before.categoryKey, subcategoryKey: before.subcategoryKey ?? null }
              : null;
            void send(
              transaction,
              {
                categoryKey: was?.categoryKey ?? null,
                subcategoryKey: was?.subcategoryKey ?? null,
                restore: { source: before.source ?? null, ruleId: before.ruleId ?? null, setAt: before.setAt ?? null },
              },
              categoryPatch(list, was, before.source ?? null, before.setAt ?? null),
            );
          },
        },
      });
    },
    [list, send],
  );

  return { setCategory };
}
