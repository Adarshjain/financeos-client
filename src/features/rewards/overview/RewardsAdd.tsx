'use client';

import React from 'react';

const noop = () => undefined;
const RegisterContext = React.createContext<(add: (() => void) | null) => void>(noop);

/** Lets a tab's page hand the shell the same-page add the top bar's + should run. */
export const RewardsAddProvider = RegisterContext.Provider;

/** Registers `add` as the top bar's + while the calling page is mounted (and `enabled`). */
export function useRewardsAdd(add: () => void, enabled: boolean): void {
  const register = React.useContext(RegisterContext);
  const latest = React.useRef(add);
  React.useEffect(() => {
    latest.current = add;
  });
  React.useEffect(() => {
    if (!enabled) return;
    register(() => latest.current());
    return () => register(null);
  }, [enabled, register]);
}
