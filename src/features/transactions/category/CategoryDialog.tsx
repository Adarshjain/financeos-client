'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Banner, Dialog, DialogBody, DialogContent, showToast } from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { useCategories } from '@/lib/query/hooks/useCategories';
import type { Transaction } from '@/lib/transaction.types';

import { CategoriesField } from '../form/CategoriesField';
import { buildRequest, valuesFromTransaction } from '../form/transactionFormModel';
import { useCategorySuggestions } from '../form/useCategorySuggestions';
import { useTransactionMutations } from '../form/useTransactionMutations';

const NO_CATEGORIES: never[] = [];
const noop = () => undefined;

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
      await updateMutation.mutateAsync({ id: transaction.id, body });
      showToast('Transaction saved!');
      onClose();
      router.refresh();
    } catch (e) {
      setError(getErrorMessage(e, 'An unexpected error occurred'));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        size="md"
        title="Set category"
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: saving }}
        primary={{ label: 'Save', onSelect: () => void save(), loading: saving }}
      >
        <DialogBody className="flex flex-col gap-space-12">
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
       </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
