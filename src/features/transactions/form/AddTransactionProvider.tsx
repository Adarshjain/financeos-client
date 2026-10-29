'use client';

import React from 'react';

import type { Account } from '@/lib/account.types';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';

// The dialog code is not in the page: it loads when the user presses a trigger (see useLazyDialog).
const loadAddTransaction = () =>
  Promise.all([
    import('@/features/accounts/form/ds/AccountDialogs').then((m) => m.AccountDialogs),
    import('./TransactionFormDialog').then((m) => m.TransactionFormDialog),
  ]);

interface AddTransactionApi {
  /**
   * Opens Add transaction in place; the URL never changes. `defaultAccountId` starts the form on that account.
   * The first press loads the dialog code (`loading` is true meanwhile); resolves to whether it opened.
   */
  open: (options?: { defaultAccountId?: string; beforeOpen?: () => void }) => Promise<boolean>;
  /** Starts loading the dialog code; call it on pointerdown of a trigger. */
  preload: () => void;
  /** True while a press waits for the dialog code: the pressed control shows its loading state. */
  loading: boolean;
}

const AddTransactionContext = React.createContext<AddTransactionApi>({ open: () => Promise.resolve(true), preload: () => {}, loading: false });

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
  const lazy = useLazyDialog(loadAddTransaction);
  const { run, preload, loading } = lazy;
  const api = React.useMemo<AddTransactionApi>(
    () => ({ open: (options) =>
        run(() => {
          options?.beforeOpen?.();
          setState({ defaultAccountId: options?.defaultAccountId ?? '' });
        }), preload, loading }),
    [run, preload, loading],
  );
  const [AccountDialogs, TransactionFormDialog] = lazy.Component ?? [null, null];
  return (
    <AddTransactionContext.Provider value={api}>
      {children}
      {state && AccountDialogs && TransactionFormDialog ? (
        // The provider sits above every page's own AccountDialogs, so the dialog brings one: Add account opens nested on top.
        <AccountDialogs>
          <TransactionFormDialog
            defaultAccountId={state.defaultAccountId}
            today={today}
            accounts={null as Account[] | null}
            onClose={() => setState(null)}
          />
        </AccountDialogs>
      ) : null}
    </AddTransactionContext.Provider>
  );
}
