'use client';

import React from 'react';

const RefreshContext = React.createContext<() => void>(() => undefined);

/** Provided by the page: re-reads the server figures (usage bars, so-far amounts) after something changed. */
export const RulesRefreshProvider = RefreshContext.Provider;

/** Call after a save, delete or reorder succeeded. Outside the page it does nothing. */
export function useRefreshUsage(): () => void {
  return React.useContext(RefreshContext);
}
