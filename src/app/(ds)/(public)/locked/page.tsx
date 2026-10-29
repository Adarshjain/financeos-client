import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import React from 'react';

import { parseLockedUrl } from '@/features/app-lock/lockedUrl';
import { LockScreen } from '@/features/app-lock/LockScreen';
import type { SearchParams } from '@/features/shell/searchParams';
import { ApiError, appLockApi } from '@/lib/apiClient';
import { redirectToSignIn } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Locked',
};

export default async function DsLockedPage({ searchParams }: { searchParams: SearchParams }) {
  const { from } = parseLockedUrl(await searchParams);

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
