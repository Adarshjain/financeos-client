'use client';

import React from 'react';

import { useLazyDialog } from '@/lib/lazy/useLazyDialog';

// The dialog code is not in the page: it loads when the user presses a trigger (see useLazyDialog).
const loadRecordTradeDialog = () => import('@/features/investments/tradebook/TradeDialog').then((m) => m.RecordTradeDialog);

interface AddTradeApi {
  /** Opens Record trade in place; the URL never changes. The first press loads the dialog code; resolves to whether it opened.
   * `beforeOpen` runs in the same update that opens it (e.g. closing the sheet that launched it). */
  open: (options?: { beforeOpen?: () => void }) => Promise<boolean>;
  /** Starts loading the dialog code; call it on pointerdown of a trigger. */
  preload: () => void;
  /** True while a press waits for the dialog code: the pressed control shows its loading state. */
  loading: boolean;
}

const AddTradeContext = React.createContext<AddTradeApi>({ open: () => Promise.resolve(true), preload: () => {}, loading: false });

export function useAddTrade(): AddTradeApi {
  return React.useContext(AddTradeContext);
}

/** Holds the Record trade dialog above the signed-in shell, so the More sheet's Quick add Trade opens it from state. */
export function AddTradeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const { Component: RecordTradeDialog, run, preload, loading } = useLazyDialog(loadRecordTradeDialog);
  const api = React.useMemo<AddTradeApi>(() => ({ open: (options) =>
        run(() => {
          options?.beforeOpen?.();
          setOpen(true);
        }), preload, loading }), [run, preload, loading]);
  return (
    <AddTradeContext.Provider value={api}>
      {children}
      {open && RecordTradeDialog ? <RecordTradeDialog onClose={() => setOpen(false)} /> : null}
    </AddTradeContext.Provider>
  );
}
