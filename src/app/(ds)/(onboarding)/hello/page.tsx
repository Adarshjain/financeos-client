import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import React from 'react';

import { HelloScreen } from '@/features/onboarding/hello/HelloScreen';
import { appHref } from '@/features/shell/routes';
import { gmailApi } from '@/lib/apiClient';
import { requireAuth } from '@/lib/auth';
import { todayInAppZone } from '@/lib/date-range';

export const metadata: Metadata = { title: 'Hello' };

/** The one-time Hello. It lives outside the app layout (no rail, no tab bar), so its gate never loops. */
export default async function HelloPage() {
  const user = await requireAuth();
  // Hello is once: a finished user (or a reload after submitting) goes straight to Home.
  if (user.helloDone) redirect(appHref('/dashboard'));

  const connections = await gmailApi.listConnections();
  const hasGmail = connections.some((c) => c.isConnected);

  return (
    <HelloScreen
      displayName={user.displayName ?? null}
      nameFromGoogle={user.hasPassword === false && Boolean(user.displayName?.trim())}
      birthDate={user.birthDate ?? null}
      birthDateFromGoogle={user.birthDateSource === 'GOOGLE'}
      googleBirthdayAvailable={user.googleBirthdayAvailable === true}
      hasGmail={hasGmail}
      today={todayInAppZone()}
    />
  );
}
