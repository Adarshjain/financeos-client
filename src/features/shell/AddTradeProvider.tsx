'use client';

import React from 'react';

import { RecordTradeDialog } from '@/features/investments/tradebook/TradeDialog';

interface AddTradeApi {
  /** Opens Record trade in place; the URL never changes. */
  open: () => void;
}

const AddTradeContext = React.createContext<AddTradeApi>({ open: () => {} });

export function useAddTrade(): AddTradeApi {
  return React.useContext(AddTradeContext);
}

/** Holds the Record trade dialog above the signed-in shell, so the More sheet's Quick add Trade opens it from state. */
export function AddTradeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const api = React.useMemo<AddTradeApi>(() => ({ open: () => setOpen(true) }), []);
  return (
    <AddTradeContext.Provider value={api}>
      {children}
      {open ? <RecordTradeDialog onClose={() => setOpen(false)} /> : null}
    </AddTradeContext.Provider>
  );
}
