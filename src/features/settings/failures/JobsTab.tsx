'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Pager } from '@/components/ds/Pager/Pager';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { Switch } from '@/components/ds/Switch/Switch';
import { Text } from '@/components/ds/Text/Text';
import { unwrapAction } from '@/lib/actionResult';

import { JobDetailsDialog } from './FailureDetailsDialog';
import { dismissJob, loadFailedJobs, retryJob } from './failuresActions';
import { type FailedJob, failureKeys, FAILURES_PAGE_SIZE, firstLine, jobSecondary, openFromRow } from './failuresModel';
import { ReasonDialog } from './ReasonDialog';
import { useFailureRunner } from './useFailureRunner';

/** The Jobs tab: Show dismissed, rows with a ⋯ menu, Details, Dismiss… and the Pager. */
export function JobsTab() {
  const [showDismissed, setShowDismissed] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [details, setDetails] = React.useState<FailedJob | null>(null);
  const [dismissing, setDismissing] = React.useState<FailedJob | null>(null);
  const run = useFailureRunner();

  const { data, isPending, isError } = useQuery({
    queryKey: failureKeys.jobs(showDismissed, page),
    queryFn: () => unwrapAction(loadFailedJobs(showDismissed, page)),
    placeholderData: keepPreviousData,
  });

  const items = data?.content ?? [];
  const retry = (job: FailedJob) => run(retryJob(job.id), 'Retrying that job');
  const open = (job: FailedJob) => !job.dismissedAt;

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-12">
      <label className="flex items-center gap-space-8 self-start">
        <Switch
          checked={showDismissed}
          onCheckedChange={(on) => {
            setShowDismissed(on);
            setPage(0);
          }}
        />
        <Text variant="label">Show dismissed</Text>
      </label>
      <Card>
        {isPending ? (
          <div className="flex flex-col gap-space-8 p-space-16">
            <Skeleton height={16} />
            <Skeleton height={16} width="60%" />
          </div>
        ) : isError && items.length === 0 ? (
          <EmptyState compact title="Couldn't load the jobs." />
        ) : items.length === 0 ? (
          <EmptyState compact title="No failed jobs in the last 30 days." />
        ) : (
          items.map((job) => (
            <ListRow
              key={job.id}
              title={job.jobName}
              subtitle={jobSecondary(job)}
              onClick={(e) => openFromRow(e, () => setDetails(job))}
              actions={[
                ...(open(job) && job.retryable ? [{ id: 'retry', label: 'Retry', onSelect: () => void retry(job) }] : []),
                ...(open(job) ? [{ id: 'dismiss', label: 'Dismiss…', onSelect: () => setDismissing(job) }] : []),
                { id: 'details', label: 'Details', onSelect: () => setDetails(job) },
              ]}
            >
              {firstLine(job.error) ? (
                <Text variant="label" tone="ink-4" truncate className="block mt-space-2">
                  {firstLine(job.error)}
                </Text>
              ) : null}
            </ListRow>
          ))
        )}
        <Pager
          page={page}
          size={FAILURES_PAGE_SIZE}
          totalElements={data?.totalElements ?? 0}
          totalPages={data?.totalPages ?? 0}
          unit="jobs"
          sizeOptions={[FAILURES_PAGE_SIZE]}
          onPageChange={setPage}
        />
      </Card>

      {details ? (
        <JobDetailsDialog
          item={details}
          onClose={() => setDetails(null)}
          retry={
            open(details) && details.retryable
              ? {
                  label: 'Retry',
                  onSelect: () => {
                    const d = details;
                    setDetails(null);
                    void retry(d);
                  },
                }
              : undefined
          }
          second={
            open(details)
              ? {
                  label: 'Dismiss…',
                  onSelect: () => {
                    setDismissing(details);
                    setDetails(null);
                  },
                }
              : undefined
          }
        />
      ) : null}
      {dismissing ? (
        <ReasonDialog
          title="Dismiss this job?"
          description="It leaves the failed list. It can still be seen with Show dismissed."
          confirmLabel="Dismiss"
          onClose={() => setDismissing(null)}
          onConfirm={async (reason) => {
            const ok = await run(dismissJob(dismissing.id, reason), 'Job dismissed');
            if (ok) setDismissing(null);
          }}
        />
      ) : null}
    </div>
  );
}
