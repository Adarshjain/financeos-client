'use client';

import React, { useMemo } from 'react';

import { Card } from '@/components/ds/Card/Card';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { Pager } from '@/components/ds/Pager/Pager';
import { JobsHistory } from '@/components/organisms/JobsHistory/JobsHistory';
import { useJobsHistory } from '@/features/jobs/useJobsHistory';
import type { JobResponse } from '@/lib/types';
import { useAppRouter } from '@/lib/useAppRouter';

import { ACTIVITY_SIZE_OPTIONS, activityUrl, type ActivityUrlState } from './activityModel';

/** The jobs list: Job, Started, Took, Result, Status and View, with the Pager above and below. */
export function ActivityJobsCard({
  statusFilter,
  typeFilter,
  size,
  page,
  jobId,
}: ActivityUrlState & { page: number; jobId: string | null }) {
  const router = useAppRouter();
  const [pagePending, startTransition] = React.useTransition();
  const { jobs, totalPages, totalElements, isPending, isPlaceholderData } = useJobsHistory({ page, size, statusFilter, typeFilter });
  const state = useMemo(() => ({ statusFilter, typeFilter, size }), [statusFilter, typeFilter, size]);

  const openHref = React.useCallback(
    (job: JobResponse) => activityUrl(state, { newPage: page, job: job.id }),
    [state, page],
  );

  const pager = (
    <Pager
      page={page}
      size={size}
      totalElements={totalElements}
      totalPages={totalPages}
      unit="jobs"
      sizeOptions={ACTIVITY_SIZE_OPTIONS}
      sizeLabel={(n) => `${n} / page`}
      onPageChange={(p) => startTransition(() => router.replace(activityUrl(state, { newPage: p, job: jobId }), { scroll: false }))}
      onSizeChange={(s) => startTransition(() => router.replace(activityUrl({ ...state, size: s }, { job: jobId }), { scroll: false }))}
    />
  );

  return (
    <Card>
      <JobsHistory
        jobs={jobs}
        openHref={openHref}
        replaceOnOpen
        onOpen={(job) => router.replace(openHref(job), { scroll: false })}
        loading={isPending || isPlaceholderData || pagePending}
        skeletonRows={size}
        pager={pager}
        empty={
          <EmptyState
            compact
            title="No jobs match"
            action={
              statusFilter || typeFilter
                ? {
                    label: 'Clear filters',
                    variant: 'link',
                    href: activityUrl({ statusFilter: '', typeFilter: '', size }),
                  }
                : undefined
            }
          />
        }
      />
    </Card>
  );
}
