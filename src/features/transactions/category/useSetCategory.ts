'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React from 'react';

import { dismissToast, showToast } from '@/components/ds/Toast/Toast';
import { ActionError, unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { CategoryDef, CategoryPick } from '@/lib/categoryList.types';
import { invalidateUncategorizedQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import type { SetCategoryResponse, Transaction } from '@/lib/transaction.types';

import { patchChange } from '../optimistic/optimisticModel';
import { useOptimisticTransactions } from '../optimistic/OptimisticTransactions';
import { createRule } from '../rules/ruleActions';
import { setTransactionCategory } from '../transactionActions';
import { categoryPatch, savedMessage } from './categoryModel';

/** The Undo toast of a row's latest set: a new set on the row closes it, so an old Undo can never overwrite a newer pick. */
const undoToastId = (transactionId: string) => `set-category-undo-${transactionId}`;

/** The transaction to set. */
type SettableTransaction = Pick<Transaction, 'id'>;

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
        void invalidateUncategorizedQueries(queryClient);
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

  /** "Do the same next time": a rule that matches the description (contains) and sets this category. */
  const saveRule = React.useCallback(
    async (merchantKey: string, pick: CategoryPick) => {
      try {
        await unwrapAction(
          createRule({ merchantKey, matchType: 'CONTAINS', categoryKey: pick.categoryKey, subcategoryKey: pick.subcategoryKey }),
        );
        void queryClient.invalidateQueries({ queryKey: keys.rules.all });
        showToast('Rule saved');
      } catch (e) {
        const conflict = e instanceof ActionError && e.response.code === 'CONFLICT';
        showToast(conflict ? 'A rule for this pattern already exists.' : getErrorMessage(e, "Couldn't save the rule. Try again."), {
          tone: 'danger',
        });
      }
    },
    [queryClient],
  );

  /** Puts a category on the transaction. */
  const setCategory = React.useCallback(
    async (transaction: SettableTransaction, pick: CategoryPick) => {
      dismissToast(undoToastId(transaction.id));
      const response = await send(
        transaction,
        { categoryKey: pick.categoryKey, subcategoryKey: pick.subcategoryKey },
        categoryPatch(list, pick, 'USER', new Date().toISOString()),
      );
      if (!response) return;
      const before = response.previous;
      const undo = {
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
      };
      // A category a rule or the auto-categoriser had set offers a rule for the next ones; one the user set never does.
      const offerKey = before.source === 'RULE' || before.source === 'AUTO' ? response.ruleKey || null : null;
      showToast(savedMessage(list, pick), {
        id: undoToastId(transaction.id),
        ...(offerKey
          ? {
              action: { label: `Do the same next time for ‘${offerKey}’?`, onSelect: () => void saveRule(offerKey, pick) },
              secondaryAction: undo,
            }
          : { action: undo }),
      });
    },
    [list, send, saveRule],
  );

  return { setCategory };
}
