'use client';

import { useAddLending } from '@/features/lendings/form/AddLendingProvider';
import { useAddTransaction } from '@/features/transactions/form/AddTransactionProvider';

import { useAddTrade } from './AddTradeProvider';
import type { ShellQuickAddItem } from './navigation';

/** Opens the Quick add dialog of a `dialog` item (Transaction, Lending, Trade) from state; no URL change. */
export function useOpenQuickAddDialog(): (dialog: NonNullable<ShellQuickAddItem['dialog']>) => void {
  const addLending = useAddLending();
  const addTransaction = useAddTransaction();
  const addTrade = useAddTrade();
  return (dialog) => {
    if (dialog === 'transaction') addTransaction.open();
    else if (dialog === 'lending') addLending.open();
    else addTrade.open();
  };
}
