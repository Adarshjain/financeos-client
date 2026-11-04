import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { redirect } from 'next/navigation';
import React from 'react';

import { buildJobsQueryParams } from '@/features/jobs/jobsFilterModel';
import { guardSession } from '@/features/shell/loadHelpers';
import { clampPage } from '@/features/shell/pagination';
import type { SearchParams } from '@/features/shell/searchParams';
import { IMPORT_JOB_TYPE, importUrl, parseImportAccount, parseImportHeld, parseImportPage, RECENT_IMPORTS_SIZE, recentImportsSince } from '@/features/transactions/import/importModel';
import { ImportScreen } from '@/features/transactions/import/ImportScreen';
import { serverApi } from '@/lib/api/server';
import type { HeldUpload } from '@/lib/api/types';
import { accountsApi, jobsApi } from '@/lib/apiClient';
import { todayInAppZone } from '@/lib/date-range';
import { getQueryClient, keys } from '@/lib/query';

export const metadata = { title: 'Import' };

/** /transactions/import: the accounts and the latest imports are fetched here, so the first paint needs no request. */
export default async function DsImportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const initialAccountId = parseImportAccount(params);
  const since = recentImportsSince(todayInAppZone());
  const heldId = parseImportHeld(params);
  const page = parseImportPage(params);
  const query = (p: number) => buildJobsQueryParams({ page: p, size: RECENT_IMPORTS_SIZE, statusFilter: '', typeFilter: IMPORT_JOB_TYPE, since });
  const recent = query(page);
  const newest = query(0);
  // The newest page also tells the form whether an import is running; on the first page it is the same read.
  const [accounts, jobs, newestJobs, held] = await guardSession(
    Promise.all([
      accountsApi.list(),
      jobsApi.list(recent),
      page > 0 ? jobsApi.list(newest) : null,
      // A failed read leaves the section to load itself in the browser.
      serverApi.GET('/api/v1/held-uploads').then((r) => (r.data ?? []) as HeldUpload[]).catch(() => undefined),
    ]),
  );
  // A page past the last one (jobs aged out of the 30 days): go to the last page instead.
  const totalPages = jobs.totalPages ?? 0;
  if (page > 0 && jobs.content?.length === 0 && totalPages > 0 && page >= totalPages) {
    redirect(importUrl({ page: clampPage(page, totalPages), account: initialAccountId }));
  }

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.accounts.list(), accounts);
  queryClient.setQueryData(keys.jobs.list(recent), jobs);
  if (held) queryClient.setQueryData(keys.heldUploads.all, held);
  if (newestJobs) queryClient.setQueryData(keys.jobs.list(newest), newestJobs);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ImportScreen initialAccounts={accounts} initialAccountId={initialAccountId} since={since} page={page} initialHeld={held} heldId={heldId} />
    </HydrationBoundary>
  );
}
