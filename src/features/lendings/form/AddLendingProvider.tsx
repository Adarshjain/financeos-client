'use client';

import React from 'react';

import { useLazyDialog } from '@/lib/lazy/useLazyDialog';
import type { CounterpartyResponse } from '@/lib/lending.types';

// The dialog code is not in the page: it loads when the user presses a trigger (see useLazyDialog).
const loadAddLendingDialog = () => import('./AddLendingDialog').then((m) => m.AddLendingDialog);

interface AddLendingApi {
  /** Opens Add lending in place; the URL never changes. The first press loads the dialog code; resolves to whether it opened.
   * `beforeOpen` runs in the same update that opens it (e.g. closing the sheet that launched it). */
  open: (options?: { beforeOpen?: () => void }) => Promise<boolean>;
  /** Opens it with this person already picked (a person's own page). */
  openFor: (person: CounterpartyResponse) => Promise<boolean>;
  /** Starts loading the dialog code; call it on pointerdown of a trigger. */
  preload: () => void;
  /** True while a press waits for the dialog code: the pressed control shows its loading state. */
  loading: boolean;
}

const AddLendingContext = React.createContext<AddLendingApi>({
  open: () => Promise.resolve(true),
  openFor: () => Promise.resolve(true),
  preload: () => {},
  loading: false,
});

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
  const { Component: AddLendingDialog, run, preload, loading } = useLazyDialog(loadAddLendingDialog);
  const api = React.useMemo<AddLendingApi>(
    () => ({
      open: (options) =>
        run(() => {
          options?.beforeOpen?.();
          setPerson(undefined);
          setOpen(true);
        }),
      openFor: (p) =>
        run(() => {
          setPerson(p);
          setOpen(true);
        }),
      preload,
      loading,
    }),
    [run, preload, loading],
  );
  return (
    <AddLendingContext.Provider value={api}>
      {children}
      {open && AddLendingDialog ? <AddLendingDialog initialPerson={person} onClose={() => setOpen(false)} /> : null}
    </AddLendingContext.Provider>
  );
}
