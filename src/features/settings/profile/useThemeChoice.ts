import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

export type ThemeChoice = 'light' | 'dark' | 'system';

/** The saved theme and its setter; `theme` is undefined until mounted so server and first client render match. */
export function useThemeChoice() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  return { theme: mounted ? (theme as ThemeChoice | undefined) : undefined, setTheme: setTheme as (t: ThemeChoice) => void };
}
