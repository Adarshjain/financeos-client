'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { useJobsHistory } from '@/features/jobs/useJobsHistory';

import { ActivityFilters } from './ActivityFilters';
import { ActivityJobsCard } from './ActivityJobsCard';
import { activityUrl } from './activityModel';
import { JobResultCard } from './JobResultCard';

export interface ActivityPageProps {
  statusFilter: string;
  typeFilter: string;
  page: number;
  size: number;
  /** `?job=`: the job whose result card is open. */
  jobId: string | null;
}

/** Settings → Activity: filter chips, the jobs list, and the result card of the job picked with View. */
export function ActivityPage({ statusFilter, typeFilter, page, size, jobId }: ActivityPageProps) {
  const router = useRouter();
  const { jobs } = useJobsHistory({ page, size, statusFilter, typeFilter });

  const close = () =>
    router.push(activityUrl({ statusFilter, typeFilter, size }, { newPage: page }), { scroll: false });

  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <ActivityFilters statusFilter={statusFilter} typeFilter={typeFilter} size={size} />
      <ActivityJobsCard
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        size={size}
        page={page}
        jobId={jobId}
      />
      {jobId ? <JobResultCard jobId={jobId} jobs={jobs} onClose={close} /> : null}
    </div>
  );
}
