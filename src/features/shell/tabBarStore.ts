'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';

import { hidesTabBar } from './navigation';

/**
 * Pages whose phone tab bar depends on their own state (a dashboard while editing) ask for it hidden with
 * `useHideTabBar(active)`. Routes that always hide it live in `hidesTabBar`.
 */
let requests = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Hides the phone tab bar while `active` is true and this component is mounted. */
export function useHideTabBar(active: boolean) {
  useEffect(() => {
    if (!active) return undefined;
    requests += 1;
    emit();
    return () => {
      requests -= 1;
      emit();
    };
  }, [active]);
}

/** True when the phone tab bar is hidden on the current page: a route that hides it, or a page that asked. */
export function useTabBarHidden(): boolean {
  let pathname: string | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    pathname = usePathname();
  } catch {
    pathname = null;
  }
  const requested = useSyncExternalStore(subscribe, () => requests > 0, () => false);
  return hidesTabBar(pathname) || requested;
}
