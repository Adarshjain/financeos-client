import { headers } from 'next/headers';
import { redirect, unstable_rethrow } from 'next/navigation';

import { isLockRoute, lockHref } from '@/lib/appLock';

/** The x-pathname the proxy sets, or null outside a request. */
export async function currentPathname(): Promise<string | null> {
  try {
    return (await headers()).get('x-pathname');
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

/** True inside a server action (Next marks its POST with `next-action`). */
export async function isInServerAction(): Promise<boolean> {
  try {
    return (await headers()).has('next-action');
  } catch (error) {
    unstable_rethrow(error);
    return false;
  }
}

/** Sends the visitor to the lock screen with the current page as `from`. Returns (does nothing) when already on the lock screen. */
export async function redirectToLock(): Promise<void> {
  const pathname = await currentPathname();
  if (isLockRoute(pathname)) return;
  redirect(lockHref(pathname));
}
