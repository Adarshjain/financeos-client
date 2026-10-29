'use client';

import { useAddLending } from '@/features/lendings/form/AddLendingProvider';
import { useAddTransaction } from '@/features/transactions/form/AddTransactionProvider';

import { useAddTrade } from './AddTradeProvider';
import type { ShellQuickAddItem } from './navigation';

type QuickAddDialog = NonNullable<ShellQuickAddItem['dialog']>;

/**
 * Opens the Quick add dialog of a `dialog` item (Transaction, Lending, Trade) from state; no URL change.
 * The first press loads the dialog's code (see useQuickAddLoading); resolves to whether the dialog opened.
 */
export function useOpenQuickAddDialog(): (dialog: QuickAddDialog, beforeOpen?: () => void) => Promise<boolean> {
  const addLending = useAddLending();
  const addTransaction = useAddTransaction();
  const addTrade = useAddTrade();
  return (dialog, beforeOpen) => {
    const options = { beforeOpen };
    return dialog === 'transaction' ? addTransaction.open(options) : dialog === 'lending' ? addLending.open(options) : addTrade.open(options);
  };
}

/** The trigger side of a lazy Quick add dialog: start loading on pointerdown, show `isLoading` on the pressed control. */
export function useQuickAddLoading(): { preload: (dialog: QuickAddDialog) => void; isLoading: (dialog: QuickAddDialog) => boolean } {
  const addLending = useAddLending();
  const addTransaction = useAddTransaction();
  const addTrade = useAddTrade();
  const of = (dialog: QuickAddDialog) => (dialog === 'transaction' ? addTransaction : dialog === 'lending' ? addLending : addTrade);
  return { preload: (dialog) => of(dialog).preload?.(), isLoading: (dialog) => Boolean(of(dialog).loading) };
}
