'use client';

import React, { useEffect, useRef } from 'react';

import { Button, Card, CardEmpty, Text } from '@/components/ds';
import { ActiveJobBody } from '@/features/jobs/ds/ActiveJobBody';
import { JobActions } from '@/features/jobs/ds/JobActions';
import { JobErrorBody } from '@/features/jobs/ds/JobErrorBody';
import { JobResultBody } from '@/features/jobs/ds/results/JobResultBody';
import { isActiveJob } from '@/features/jobs/jobModel';
import { startedLabel, tookLabel, typeLabel } from '@/features/jobs/jobsModel';
import { useJobStatusPolling } from '@/features/jobs/useJobStatusPolling';
import type { JobResponse } from '@/lib/types';

import { startedByLabel } from './activityModel';

/** One job's full result under the list: opened by `?job=`, from the page's rows or fetched when it is not on the page. */
export function JobResultCard({
  jobId,
  jobs,
  onClose,
}: {
  jobId: string;
  jobs: JobResponse[];
  onClose: () => void;
}) {
  const onPage = jobs.find((j) => j.id === jobId) ?? null;
  const { job: fetched, error } = useJobStatusPolling(onPage ? null : jobId);
  const job = onPage ?? fetched;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [jobId]);

  const close = (
    <Text variant="label" as="span">
      <Button variant="link" size="sm" onClick={onClose}>
        Close
      </Button>
    </Text>
  );

  if (!job) {
    return (
      <Card ref={ref} title="Job result" action={close} data-testid="job-result-card">
        <CardEmpty>{error ?? 'Loading job…'}</CardEmpty>
      </Card>
    );
  }

  const took = tookLabel(job.startedAt, job.finishedAt);
  const hasError = Boolean(job.errorCode || job.errorMessage);

  return (
    <Card
      ref={ref}
      title={`Job result · ${typeLabel(job.type)} · ${startedLabel(job.createdAt)}`}
      subtitle={took === '—' ? startedByLabel(job) : `${startedByLabel(job)} · took ${took}`}
      action={
        <div className="flex items-center gap-space-8">
          <JobActions job={job} />
          {close}
        </div>
      }
      data-testid="job-result-card"
      data-job-id={job.id}
    >
      <div className="flex flex-col gap-space-8 px-space-16 pb-space-16">
        {isActiveJob(job.status) ? <ActiveJobBody job={job} /> : null}
        {job.status === 'SUCCEEDED' ? <JobResultBody job={job} /> : null}
        {(job.status === 'FAILED' || job.status === 'CANCELLED') && hasError ? (
          <JobErrorBody errorCode={job.errorCode} errorMessage={job.errorMessage} defaultOpen />
        ) : null}
        {job.status === 'CANCELLED' && !hasError ? (
          <Text variant="body" tone="ink-2" as="p">
            Cancelled by you
          </Text>
        ) : null}
      </div>
    </Card>
  );
}
