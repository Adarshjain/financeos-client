'use client';

import React from 'react';

import { AddLendingDialog } from './AddLendingDialog';

interface AddLendingApi {
  /** Opens Add lending in place; the URL never changes. */
  open: () => void;
}

const AddLendingContext = React.createContext<AddLendingApi>({ open: () => {} });

export function useAddLending(): AddLendingApi {
  return React.useContext(AddLendingContext);
}

/**
 * Holds the Add lending dialog above the whole signed-in shell, so the Lendings top-bar + and the
 * More sheet's Quick add Lending tile open the same dialog from state.
 */
export function AddLendingProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const api = React.useMemo<AddLendingApi>(() => ({ open: () => setOpen(true) }), []);
  return (
    <AddLendingContext.Provider value={api}>
      {children}
      {open ? <AddLendingDialog onClose={() => setOpen(false)} /> : null}
    </AddLendingContext.Provider>
  );
}
