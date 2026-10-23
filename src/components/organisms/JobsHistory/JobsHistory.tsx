'use client';

import Link from 'next/link';
import React from 'react';

import { Badge, Button, createDataTableColumnHelper, DataTable, Text, type TextProps } from '@/components/ds';
import { ActiveJobBody } from '@/features/jobs/ds/ActiveJobBody';
import { isActiveJob, JOB_STATUS_BADGE } from '@/features/jobs/jobModel';
import {
  jobSubject,
  phoneLine,
  resultCell,
  startedLabel,
  tookLabel,
  typeLabel,
} from '@/features/jobs/jobsModel';
import type { FileIngestionResult, JobResponse } from '@/lib/types';

export interface JobsHistoryProps {
  jobs: JobResponse[];
  /** Where View goes for a job. */
  openHref: (job: JobResponse) => string;
  /** A row was pressed. */
  onOpen?: (job: JobResponse) => void;
  /** The Pager, drawn above and below the rows. */
  pager?: React.ReactNode;
  empty?: React.ReactNode;
  loading?: boolean;
  skeletonRows?: number;
  /** A narrow list: the job's name over one status line, and View. Without it: Job, Started, Took, Result, Status, View. */
  compact?: boolean;
}

const ch = createDataTableColumnHelper<JobResponse>();

type StatusWord = { label: string; tone: NonNullable<TextProps['tone']> };

/** The word a compact row leads with: how the job ended, or that it is still going. */
export function jobStatusWord(job: JobResponse): StatusWord {
  if (job.status === 'PENDING') return { label: 'Pending', tone: 'ink-3' };
  if (job.status === 'RUNNING') return { label: 'Running', tone: 'info' };
  if (job.status === 'FAILED') return { label: 'Failed', tone: 'danger' };
  if (job.status === 'CANCELLED') return { label: 'Cancelled', tone: 'ink-3' };
  const files = job.type === 'STATEMENT_INGEST' ? ((job.result as FileIngestionResult | null)?.fileDetails ?? []) : [];
  const failed = files.filter((f) => f.status === 'FAILED').length;
  if (failed > 0 && failed === files.length) return { label: 'Failed', tone: 'danger' };
  if (failed > 0) return { label: `${failed} failed`, tone: 'warning' };
  const warnings = files.filter((f) => f.warning).length;
  if (warnings > 0) return { label: `${warnings} ${warnings === 1 ? 'warning' : 'warnings'}`, tone: 'warning' };
  return { label: 'Done', tone: 'positive' };
}

function CompactLine({ job }: { job: JobResponse }) {
  if (isActiveJob(job.status)) return <ActiveJobBody job={job} />;
  const word = jobStatusWord(job);
  const cell = resultCell(job);
  const detail = cell.kind === 'text' && cell.text !== '—' ? cell.text : null;
  return (
    <Text variant="label" tone="ink-3" as="p">
      <Text variant="label" tone={word.tone} as="span">
        {word.label}
      </Text>
      {' · '}
      {startedLabel(job.createdAt)}
      {detail ? ` · ${detail}` : ''}
    </Text>
  );
}

function ViewLink({ href }: { href: string }) {
  return (
    <Text variant="label" as="span">
      <Button asChild variant="link" size="sm">
        <Link href={href} scroll={false}>
          View
        </Link>
      </Button>
    </Text>
  );
}

/** A list of background jobs (Settings › Activity, Import › Recent imports). Put it in a Card. */
export function JobsHistory({ jobs, openHref, onOpen, pager, empty, loading, skeletonRows, compact }: JobsHistoryProps) {
  const columns = React.useMemo(
    () =>
      compact
        ? [
            ch.display({
              id: 'job',
              header: 'Job',
              meta: { size: 'fill', wrap: true, phone: 'main' },
              cell: ({ row }) => (
                <div className="flex flex-col min-w-0">
                  <Text variant="body-strong" truncate>
                    {jobSubject(row.original) ?? typeLabel(row.original.type)}
                  </Text>
                  <div className="max-desk:hidden">
                    <CompactLine job={row.original} />
                  </div>
                </div>
              ),
            }),
            ch.display({
              id: 'view',
              header: '',
              meta: { size: 'xs', align: 'end', phone: 'amount' },
              cell: ({ row }) => <ViewLink href={openHref(row.original)} />,
            }),
          ]
        : [
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
              cell: ({ row }) => <ViewLink href={openHref(row.original)} />,
            }),
          ],
    [compact, openHref],
  );

  return (
    <DataTable
      columns={columns}
      data={jobs}
      getRowId={(j) => j.id}
      loading={loading}
      skeletonRows={skeletonRows}
      pager={pager}
      phoneSub={compact ? (job) => <CompactLine job={job} /> : phoneLine}
      onRowSelect={onOpen}
      empty={empty}
      stickyHeader={false}
      hideHeader={compact}
    />
  );
}
