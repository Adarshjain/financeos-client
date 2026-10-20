'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useMemo } from 'react';

import {
  Badge,
  Button,
  Card,
  createDataTableColumnHelper,
  DataTable,
  EmptyState,
  Pager,
  Text,
} from '@/components/ds';
import { ActiveJobBody } from '@/features/jobs/ds/ActiveJobBody';
import { JOB_STATUS_BADGE } from '@/features/jobs/jobModel';
import { useJobsHistory } from '@/features/jobs/useJobsHistory';
import type { JobResponse } from '@/lib/types';

import {
  ACTIVITY_SIZE_OPTIONS,
  activityUrl,
  type ActivityUrlState,
  jobSubject,
  phoneLine,
  resultCell,
  startedLabel,
  tookLabel,
  typeLabel,
} from './activityModel';

const ch = createDataTableColumnHelper<JobResponse>();

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
    (id: string) => activityUrl(state, { newPage: page, job: id }),
    [state, page],
  );

  const columns = useMemo(
    () => [
      ch.display({
        id: 'job',
        header: 'Job',
        meta: { size: 'fill', grow: 1.4, phone: 'main' },
        cell: ({ row }) => {
          const subject = jobSubject(row.original);
          return (
            <Text variant="body" truncate>
              <Text variant="body-strong" as="span">
                {typeLabel(row.original.type)}
              </Text>
              {subject ? (
                <Text variant="body" tone="ink-3" as="span">
                  {' · '}
                  {subject}
                </Text>
              ) : null}
            </Text>
          );
        },
      }),
      ch.display({
        id: 'started',
        header: 'Started',
        meta: { size: 'md', phone: 'hidden' },
        cell: ({ row }) => (
          <Text variant="body" tone="ink-3">
            {startedLabel(row.original.createdAt)}
          </Text>
        ),
      }),
      ch.display({
        id: 'took',
        header: 'Took',
        meta: { size: 'sm', phone: 'hidden' },
        cell: ({ row }) => (
          <Text variant="body" tone="ink-3">
            {tookLabel(row.original.startedAt, row.original.finishedAt)}
          </Text>
        ),
      }),
      ch.display({
        id: 'result',
        header: 'Result',
        meta: { size: 'fill', grow: 1.4, phone: 'hidden' },
        cell: ({ row }) => {
          const cell = resultCell(row.original);
          return cell.kind === 'active' ? (
            <ActiveJobBody job={row.original} />
          ) : (
            <Text variant="body" tone={cell.tone} truncate>
              {cell.text}
            </Text>
          );
        },
      }),
      ch.display({
        id: 'status',
        header: 'Status',
        meta: { size: 'sm', phone: 'status' },
        cell: ({ row }) => {
          const badge = JOB_STATUS_BADGE[row.original.status];
          return <Badge tone={badge.tone}>{badge.label}</Badge>;
        },
      }),
      ch.display({
        id: 'view',
        header: '',
        meta: { size: 'xs', align: 'end', phone: 'hidden' },
        cell: ({ row }) => (
          <Text variant="label" as="span">
            <Button asChild variant="link" size="sm">
              <Link href={openHref(row.original.id)} scroll={false}>
                View
              </Link>
            </Button>
          </Text>
        ),
      }),
    ],
    [openHref],
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
      <DataTable
        columns={columns}
        data={jobs}
        getRowId={(j) => j.id}
        loading={isPending}
        skeletonRows={size}
        pager={pager}
        phoneSub={phoneLine}
        onRowSelect={(job) => router.push(openHref(job.id), { scroll: false })}
        empty={<EmptyState compact title="No background jobs found matching the selected filters." />}
        stickyHeader={false}
      />
    </Card>
  );
}
