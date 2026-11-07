import { notFound } from 'next/navigation';
import React from 'react';

import { FAILURES_PAGE_SIZE } from '@/features/settings/failures/failuresModel';
import { FailuresScreen } from '@/features/settings/failures/FailuresScreen';
import { guardSession } from '@/features/shell/loadHelpers';
import { failuresApi } from '@/lib/apiClient';
import { requireAuth } from '@/lib/auth';

export const metadata = { title: 'Failures' };

export default async function DsSettingsFailuresPage() {
  const user = await requireAuth();
  if (!user.failuresAdmin) notFound();
  // The counts and the first page of the default (Emails, Failed) tab, fetched once here.
  const [summary, emails] = await Promise.all([
    guardSession(failuresApi.summary()),
    guardSession(failuresApi.listGmail({ page: 0, size: FAILURES_PAGE_SIZE })),
  ]);
  return <FailuresScreen summary={summary} emails={emails} currentUserId={user.id} />;
}
