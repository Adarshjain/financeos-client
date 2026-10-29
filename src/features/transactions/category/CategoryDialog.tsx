'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Banner, Dialog, showToast } from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { useCategories } from '@/lib/query/hooks/useCategories';
import type { Transaction } from '@/lib/transaction.types';

import { CategoriesField } from '../form/CategoriesField';
import { buildRequest, valuesFromTransaction } from '../form/transactionFormModel';
import { useCategorySuggestions } from '../form/useCategorySuggestions';
import { useTransactionMutations } from '../form/useTransactionMutations';
import { patchChange } from '../optimistic/optimisticModel';
import { useOptimisticTransactions } from '../optimistic/OptimisticTransactions';

const NO_CATEGORIES: never[] = [];
const noop = () => undefined;
const FORM_ID = 'category-form';

export interface CategoryDialogProps {
  /** The transaction to set categories on, in full. */
  transaction: Transaction;
  /** Cancelled, or saved. */
  onClose: () => void;
}

/** Set category: only the Categories field of the Edit form. Saves through the Edit update with every other field as stored. */
export function CategoryDialog({ transaction, onClose }: CategoryDialogProps) {
  const router = useRouter();
  const { data: allCategories = NO_CATEGORIES } = useCategories();
  const { updateMutation } = useTransactionMutations();
  const optimistic = useOptimisticTransactions();
  const [error, setError] = React.useState<string | null>(null);
  const { localCategories, selectedCategories, setSelectedCategories, creatingCategory, createCategory } =
    useCategorySuggestions({
      categories: allCategories,
      initialSelectedCategories: transaction.categories ?? [],
      isUpdateMode: true,
      onMccSuggested: noop,
    });
  const saving = updateMutation.isPending;

  const save = async () => {
    setError(null);
    try {
      const body = buildRequest(valuesFromTransaction(transaction), {
        isUpdate: true,
        source: transaction.source,
        categoryIds: selectedCategories.map((c) => c.id),
        // The stored card is kept: with no card the request carries none either way.
        supportsCards: true,
      });
      if (optimistic) {
        // The categories show on the row now and the dialog closes; the save finishes behind it.
        const shown = optimistic.begin(
          patchChange(transaction.id, { categories: selectedCategories.map((c) => ({ id: c.id, name: c.name })) }),
        );
        onClose();
        try {
          // Sent behind any earlier write to this row, on the row as the server then holds it: only the categories are ours.
          await shown.send(() =>
            updateMutation.mutateAsync({
              id: transaction.id,
              body: buildRequest(valuesFromTransaction(shown.base(transaction.id) ?? transaction), {
                isUpdate: true,
                source: transaction.source,
                categoryIds: selectedCategories.map((c) => c.id),
                supportsCards: true,
              }),
            }),
          );
          shown.settle(true);
          showToast('Transaction saved');
          router.refresh();
        } catch (e) {
          shown.settle(false);
          showToast(getErrorMessage(e, "Couldn't save the category. Try again."), { tone: 'danger' });
        }
        return;
      }
      await updateMutation.mutateAsync({ id: transaction.id, body });
      showToast('Transaction saved');
      onClose();
      router.refresh();
    } catch (e) {
      setError(getErrorMessage(e, "Couldn't save the category. Try again."));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="md"
        title="Set category"
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: saving }}
        primary={{ label: 'Set category', type: 'submit', form: FORM_ID, loading: saving }}
      >
        <Dialog.Body>
          <form
            id={FORM_ID}
            className="flex flex-col gap-space-8 desk:gap-space-12"
            onSubmit={(e) => {
              e.preventDefault();
              if (!saving) void save();
            }}
          >
          {error ? <Banner tone="danger">{error}</Banner> : null}
          <CategoriesField
            categories={localCategories}
            selectedCategoryIds={selectedCategories.map((c) => c.id)}
            creating={creatingCategory}
            onChange={(ids) =>
              setSelectedCategories(ids.map((id) => localCategories.find((c) => c.id === id)).filter((c) => c !== undefined))
            }
            onCreate={(name) => void createCategory(name)}
          />
          </form>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
