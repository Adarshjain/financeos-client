'use client';

import React from 'react';

import type { Account } from '@/lib/account.types';

import { TransactionFormDialog } from './TransactionFormDialog';

interface AddTransactionApi {
  /** Opens Add transaction in place; the URL never changes. `defaultAccountId` starts the form on that account. */
  open: (options?: { defaultAccountId?: string }) => void;
}

const AddTransactionContext = React.createContext<AddTransactionApi>({ open: () => {} });

export function useAddTransaction(): AddTransactionApi {
  return React.useContext(AddTransactionContext);
}

/**
 * Holds the one Add transaction dialog above the whole signed-in shell, so the Transactions top-bar + and the
 * More sheet's Quick add Transaction tile open the same single instance from state. The dialog loads the
 * accounts itself and, on save, refreshes the transaction queries and the page behind it.
 */
export function AddTransactionProvider({ today, children }: { today: string; children: React.ReactNode }) {
  const [state, setState] = React.useState<{ defaultAccountId: string } | null>(null);
  const api = React.useMemo<AddTransactionApi>(
    () => ({ open: (options) => setState({ defaultAccountId: options?.defaultAccountId ?? '' }) }),
    [],
  );
  return (
    <AddTransactionContext.Provider value={api}>
      {children}
      {state ? (
        <TransactionFormDialog
          defaultAccountId={state.defaultAccountId}
          today={today}
          accounts={null as Account[] | null}
          onClose={() => setState(null)}
        />
      ) : null}
    </AddTransactionContext.Provider>
  );
}
