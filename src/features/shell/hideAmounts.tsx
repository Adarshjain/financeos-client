'use client';

import React from 'react';

import { ConcealProvider } from '@/components/ds';

import { HIDE_AMOUNTS_COOKIE } from './hideAmountsName';


interface HideAmountsValue {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
}

const HideAmountsContext = React.createContext<HideAmountsValue>({ hidden: false, setHidden: () => {} });

function saveChoice(hidden: boolean): void {
  try {
    document.cookie = `${HIDE_AMOUNTS_COOKIE}=${hidden ? '1' : '0'}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax${
      window.location.protocol === 'https:' ? '; secure' : ''
    }`;
  } catch {
    // Cookies blocked: the choice still holds until the page reloads.
  }
}

/** Holds "hide amounts" for every /ds app page and tells the Dinero components below it. */
export function HideAmountsProvider({ initialHidden, children }: { initialHidden: boolean; children: React.ReactNode }) {
  const [hidden, setHiddenState] = React.useState(initialHidden);
  const value = React.useMemo<HideAmountsValue>(
    () => ({
      hidden,
      setHidden: (next) => {
        setHiddenState(next);
        saveChoice(next);
      },
    }),
    [hidden],
  );
  return (
    <HideAmountsContext.Provider value={value}>
      <ConcealProvider concealed={hidden}>{children}</ConcealProvider>
    </HideAmountsContext.Provider>
  );
}

export function useHideAmounts(): HideAmountsValue {
  return React.useContext(HideAmountsContext);
}
