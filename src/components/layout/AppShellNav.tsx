'use client';

import { usePathname } from 'next/navigation';
import { createContext, useContext, useMemo } from 'react';

import { getNavigationTree, NavItem } from './navigation';

export interface AppShellNavContextValue {
  navItems: NavItem[];
  pathname: string;
  needsReviewCount?: number | null;
  isActive: (path: string) => boolean;
}

const AppShellNavContext = createContext<AppShellNavContextValue | null>(null);

export interface AppShellNavProviderProps {
  needsReviewCount?: number | null;
  children: React.ReactNode;
}

export function AppShellNavProvider({ needsReviewCount, children }: AppShellNavProviderProps) {
  const pathname = usePathname() || '/';

  const navItems = useMemo(() => getNavigationTree(needsReviewCount), [needsReviewCount]);

  const isActive = useMemo(() => {
    return (path: string) => {
      if (path === '/') return pathname === '/';
      return pathname.startsWith(path);
    };
  }, [pathname]);

  const value = useMemo(
    () => ({
      navItems,
      pathname,
      needsReviewCount,
      isActive,
    }),
    [navItems, pathname, needsReviewCount, isActive],
  );

  return <AppShellNavContext.Provider value={value}>{children}</AppShellNavContext.Provider>;
}

export function useAppShellNav(): AppShellNavContextValue {
  const ctx = useContext(AppShellNavContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const navItems = getNavigationTree(null);
    return {
      navItems,
      pathname,
      needsReviewCount: null,
      isActive: (path: string) => (path === '/' ? pathname === '/' : pathname.startsWith(path)),
    };
  }
  return ctx;
}
