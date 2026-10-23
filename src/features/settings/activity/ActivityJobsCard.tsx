'use client';

import { useRouter } from 'next/navigation';
import React, { useMemo } from 'react';

import { Card, EmptyState, Pager } from '@/components/ds';
import { JobsHistory } from '@/components/organisms';
import { useJobsHistory } from '@/features/jobs/useJobsHistory';
import type { JobResponse } from '@/lib/types';

import { ACTIVITY_SIZE_OPTIONS, activityUrl, type ActivityUrlState } from './activityModel';

/** The jobs list: Job, Started, Took, Result, Status and View, with the Pager above and below. */
export function ActivityJobsCard({
  statusFilter,
  typeFilter,
  size,
  page,
  jobId,
}: ActivityUrlState & { page: number; jobId: string | null }) {
  const router = useRouter();
  const { jobs, totalPages, totalElements, isPending } = useJobsHistory({ page, size, statusFilter, typeFilter });
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
      onPageChange={(p) => router.push(activityUrl(state, { newPage: p, job: jobId }), { scroll: false })}
      onSizeChange={(s) => router.push(activityUrl({ ...state, size: s }, { job: jobId }), { scroll: false })}
    />
  );

  return (
    <Card>
      <JobsHistory
        jobs={jobs}
        openHref={openHref}
        onOpen={(job) => router.push(openHref(job), { scroll: false })}
        loading={isPending}
        skeletonRows={size}
        pager={pager}
        empty={
          <EmptyState
            compact
            title="No background jobs found matching the selected filters."
            action={
              statusFilter || typeFilter
                ? {
                    label: 'Clear filters',
                    variant: 'link',
                    onSelect: () => router.push(activityUrl({ statusFilter: '', typeFilter: '', size }), { scroll: false }),
                  }
                : undefined
            }
          />
        }
      />
    </Card>
  );
}
