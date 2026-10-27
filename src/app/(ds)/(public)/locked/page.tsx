import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import React from 'react';

import { LockScreen } from '@/features/appLock/LockScreen';
import { appHref, isSafeLocalPath } from '@/features/shell/routes';
import { ApiError, appLockApi } from '@/lib/apiClient';
import { isLockRoute } from '@/lib/appLock';
import { redirectToSignIn } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Locked · FinanceOS',
};

export default async function DsLockedPage({ searchParams }: { searchParams?: Promise<{ from?: string | string[] }> }) {
  const params = searchParams ? await searchParams : undefined;
  const requested = typeof params?.from === 'string' ? params.from : undefined;
  const from = requested && isSafeLocalPath(requested) && !isLockRoute(requested.split(/[?#]/)[0]) ? requested : appHref('/dashboard');

  let locked: boolean;
  try {
    const status = await appLockApi.status();
    locked = status.armed && status.locked;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) await redirectToSignIn();
    throw error;
  }
  // Nothing to unlock (turned off, signed in again, or unlocked in another tab): go where they were headed.
  if (!locked) redirect(from);

  return <LockScreen from={from} />;
}
