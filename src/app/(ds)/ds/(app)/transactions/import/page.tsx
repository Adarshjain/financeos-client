import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { buildJobsQueryParams } from '@/features/jobs/jobUtils';
import { guardSession } from '@/features/shell/loadHelpers';
import { IMPORT_JOB_TYPE, RECENT_IMPORTS_SIZE, recentImportsSince } from '@/features/transactions/import/importModel';
import { ImportScreen } from '@/features/transactions/import/ImportScreen';
import { accountsApi, jobsApi } from '@/lib/apiClient';
import { requireAuth } from '@/lib/auth';
import { todayInAppZone } from '@/lib/date-range';
import { getQueryClient, keys } from '@/lib/query';

/** /ds/transactions/import: the accounts and the latest imports are fetched here, so the first paint needs no request. */
export default async function DsImportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const requested = (await searchParams).account;
  const initialAccountId = Array.isArray(requested) ? requested[0] : requested;
  const since = recentImportsSince(todayInAppZone());
  const recent = buildJobsQueryParams({ page: 0, size: RECENT_IMPORTS_SIZE, statusFilter: '', typeFilter: IMPORT_JOB_TYPE, since });
  const [accounts, jobs] = await guardSession(Promise.all([accountsApi.list(), jobsApi.list(recent)]));

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.accounts.list(), accounts);
  queryClient.setQueryData(keys.jobs.list(recent), jobs);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ImportScreen initialAccounts={accounts} initialAccountId={initialAccountId} since={since} />
    </HydrationBoundary>
  );
}
