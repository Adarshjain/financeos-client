'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Badge, Banner, Button, Card, KpiTile, ListField, Text } from '@/components/ds';
import { ActiveJobBody } from '@/features/jobs/ds/ActiveJobBody';
import { JobActions } from '@/features/jobs/ds/JobActions';
import { JobErrorBody } from '@/features/jobs/ds/JobErrorBody';
import { isActiveJob, JOB_STATUS_BADGE } from '@/features/jobs/jobModel';
import { startedLabel, tookLabel } from '@/features/jobs/jobsModel';
import { useJobStatusPolling } from '@/features/jobs/useJobStatusPolling';
import { subCrumb } from '@/features/shell/navigation';
import { appHref } from '@/features/shell/routes';
import { ShellPage } from '@/features/shell/ShellPage';
import type { FileSummary, JobResponse } from '@/lib/types';

import { IMPORT_HREF, importJobHref, importJobTitle, importTotals, ingestResult } from './importModel';

const FILE_STATUS = {
  SUCCESS: { label: 'Done', tone: 'success' },
  SKIPPED: { label: 'Skipped', tone: 'warning' },
  FAILED: { label: 'Failed', tone: 'danger' },
} as const;

function FileSection({ file }: { file: FileSummary }) {
  const status = FILE_STATUS[file.status] ?? FILE_STATUS.FAILED;
  return (
    <Card
      title={file.filename}
      action={<Badge tone={status.tone}>{status.label}</Badge>}
      data-testid="import-file"
      data-filename={file.filename}
    >
      <ListField label="Lines read" value={file.linesParsed} />
      <ListField label="Created" value={file.created ?? '—'} />
      <ListField label="Duplicates" value={file.duplicates ?? '—'} />
      {file.errorMessage || file.warning ? (
        <div className="flex flex-col gap-space-8 p-space-16">
          {file.errorMessage ? (
            <Banner tone={file.status === 'FAILED' ? 'danger' : 'warning'}>{file.errorMessage}</Banner>
          ) : null}
          {file.warning ? <Banner tone="warning">{file.warning}</Banner> : null}
        </div>
      ) : null}
    </Card>
  );
}

/** /transactions/import/[jobId]: one import: how it went overall, then a section per file. */
export function ImportJobScreen({ jobId }: { jobId: string }) {
  const { job, error } = useJobStatusPolling(jobId);

  return (
    <ShellPage crumb={subCrumb('transactions', 'Import')} title="Import result" backHref={IMPORT_HREF}>
      {job ? <Body job={job} /> : <Text variant="body" tone="ink-3" as="p">{error ?? 'Loading import…'}</Text>}
    </ShellPage>
  );
}

function Body({ job }: { job: JobResponse }) {
  const router = useRouter();
  const result = ingestResult(job);
  const totals = result ? importTotals(result) : null;
  const took = tookLabel(job.startedAt, job.finishedAt);
  const badge = JOB_STATUS_BADGE[job.status];
  const hasError = Boolean(job.errorCode || job.errorMessage);

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Card
        title={importJobTitle(job)}
        subtitle={[job.accountName, `started ${startedLabel(job.createdAt)}`, took === '—' ? null : `took ${took}`].filter(Boolean).join(' · ')}
        action={
          <div className="flex items-center gap-space-8">
            <JobActions job={job} onRetried={(retried) => router.push(importJobHref(retried.id))} />
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </div>
        }
        data-testid="import-job"
        data-job-id={job.id}
        data-status={job.status}
      />
      {isActiveJob(job.status) ? (
        <Card className="p-space-16">
          <ActiveJobBody job={job} />
        </Card>
      ) : null}
      {job.status === 'FAILED' && !hasError ? (
        <Text variant="body" tone="danger" as="p">
          Import failed
        </Text>
      ) : null}
      {(job.status === 'FAILED' || job.status === 'CANCELLED') && hasError ? (
        <JobErrorBody errorCode={job.errorCode} errorMessage={job.errorMessage} defaultOpen />
      ) : null}
      {job.status === 'CANCELLED' && !hasError ? (
        <Text variant="body" tone="ink-2" as="p">
          Cancelled by you
        </Text>
      ) : null}
      {totals ? (
        <>
          <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:grid-cols-4 desk:gap-space-16">
            <KpiTile label="Files" value={totals.files} />
            <KpiTile label="Lines read" value={totals.lines} />
            <KpiTile label="Created" value={totals.created} />
            <KpiTile
              label="Duplicates"
              value={totals.duplicates}
              context={totals.duplicates > 0 ? 'marked for review' : undefined}
            />
          </div>
          {totals.duplicates > 0 ? (
            <Banner
              tone="warning"
              title={`${totals.duplicates} ${totals.duplicates === 1 ? 'duplicate' : 'duplicates'} found.`}
            >
              {totals.duplicates === 1 ? 'It was' : 'They were'} kept and marked &quot;Duplicate&quot; so you can merge
              or dismiss {totals.duplicates === 1 ? 'it' : 'them'} from{' '}
              <Button asChild variant="link">
                <Link href={appHref('/transactions')}>Transactions</Link>
              </Button>
              .
            </Banner>
          ) : null}
          {(result?.fileDetails ?? []).map((f, i) => (
            <FileSection key={`${i}-${f.filename}`} file={f} />
          ))}
        </>
      ) : null}
    </div>
  );
}
