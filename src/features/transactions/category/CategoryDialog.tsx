'use client';

import React from 'react';

import { CategoryPicker } from '@/components/organisms/CategoryPicker/CategoryPicker';
import type { CategoryDef, CategoryPick } from '@/lib/categoryList.types';
import { formatMoney } from '@/lib/format';
import { useCategoryList } from '@/lib/query/hooks/useCategoryList';
import type { Transaction } from '@/lib/transaction.types';

import { directionOf, pickOf } from './categoryModel';
import { useSetCategory } from './useSetCategory';

export interface CategoryDialogProps {
  /** The transaction to set the category on, in full. */
  transaction: Transaction;
  /** The picker closed: after a pick, or dismissed (nothing changes then). */
  onClose: () => void;
  /** Recent one-tap picks; none until their data is wired. */
  recent?: CategoryPick[];
}

/** Set category on one transaction: the category picker, over the transaction (description and amount). A tap saves and closes. */
export function CategoryDialog({ transaction, onClose, recent }: CategoryDialogProps) {
  const { list } = useCategoryList();
  const { setCategory } = useSetCategory(list);
  const amount = formatMoney(Math.abs(transaction.amount), { decimals: 'exact' });
  const name = transaction.description || transaction.sourcedDescription || '';
  return (
    <CategoryPicker
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      categories={list as CategoryDef[]}
      direction={directionOf(transaction)}
      value={pickOf(transaction)}
      recent={recent}
      subtitle={name ? `${name} · ${amount}` : amount}
      onPick={(pick) => void setCategory(transaction, pick)}
    />
  );
}
