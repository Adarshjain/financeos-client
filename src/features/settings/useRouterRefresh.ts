'use client';

import { useRouter } from 'next/navigation';

/**
 * A function that drops the client router cache (the main Settings page's values are server-rendered). It is a no-op outside
 * an app router (tests, Storybook), so the hooks that call it still render there.
 */
export function useRouterRefresh(): () => void {
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter();
  } catch {
    router = null;
  }
  return () => router?.refresh();
}
