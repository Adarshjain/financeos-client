'use client';

import React from 'react';

import type { CounterpartyResponse } from '@/lib/lending.types';

import { AddLendingDialog } from './AddLendingDialog';

interface AddLendingApi {
  /** Opens Add lending in place; the URL never changes. */
  open: () => void;
  /** Opens it with this person already picked (a person's own page). */
  openFor: (person: CounterpartyResponse) => void;
}

const AddLendingContext = React.createContext<AddLendingApi>({ open: () => {}, openFor: () => {} });

export function useAddLending(): AddLendingApi {
  return React.useContext(AddLendingContext);
}

/**
 * Holds the Add lending dialog above the whole signed-in shell, so the Lendings top-bar + and the
 * More sheet's Quick add Lending tile open the same dialog from state.
 */
export function AddLendingProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [person, setPerson] = React.useState<CounterpartyResponse | undefined>(undefined);
  const api = React.useMemo<AddLendingApi>(
    () => ({
      open: () => {
        setPerson(undefined);
        setOpen(true);
      },
      openFor: (p) => {
        setPerson(p);
        setOpen(true);
      },
    }),
    [],
  );
  return (
    <AddLendingContext.Provider value={api}>
      {children}
      {open ? <AddLendingDialog initialPerson={person} onClose={() => setOpen(false)} /> : null}
    </AddLendingContext.Provider>
  );
}
