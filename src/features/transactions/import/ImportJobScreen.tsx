'use client';

import Link from 'next/link';
import React from 'react';

import { Badge } from '@/components/ds/Badge/Badge';
import { Banner } from '@/components/ds/Banner/Banner';
import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Checkbox } from '@/components/ds/Checkbox/Checkbox';
import { GRID_GAP } from '@/components/ds/gridGap';
import { KpiTile } from '@/components/ds/KpiTile/KpiTile';
import { ListField } from '@/components/ds/ListField/ListField';
import { Text } from '@/components/ds/Text/Text';
import { TextField } from '@/components/ds/TextField/TextField';
import { ActiveJobBody } from '@/features/jobs/ds/ActiveJobBody';
import { JobActions } from '@/features/jobs/ds/JobActions';
import { JobErrorBody } from '@/features/jobs/ds/JobErrorBody';
import { isActiveJob, JOB_STATUS_BADGE } from '@/features/jobs/jobModel';
import { emitJobStarted } from '@/features/jobs/jobsBus';
import { startedLabel, tookLabel } from '@/features/jobs/jobsModel';
import { useJobStatusPolling } from '@/features/jobs/useJobStatusPolling';
import { subCrumb } from '@/features/shell/navigation';
import { appHref } from '@/features/shell/routes';
import { ShellPage } from '@/features/shell/ShellPage';
import { ActionError, unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { formatCount, pluralize } from '@/lib/format';
import type { FileSummary, JobResponse } from '@/lib/types';
import { useAppRouter } from '@/lib/useAppRouter';

import { retryFileWithPassword } from './importActions';
import { IMPORT_HREF, importFailureSummary, importHeldHref, importJobHref, importJobTitle, importTotals, ingestResult } from './importModel';

const FILE_STATUS = {
  SUCCESS: { label: 'Done', tone: 'success' },
  SKIPPED: { label: 'Skipped', tone: 'warning' },
  FAILED: { label: 'Failed', tone: 'danger' },
  HELD: { label: 'Needs an account', tone: 'warning' },
} as const;

/** The password box for a file that is locked or opened with the wrong password; "Try again" starts a new import. */
function PasswordRetry({ jobId, fileIndex, wrong }: { jobId: string; fileIndex: number; wrong: boolean }) {
  const router = useAppRouter();
  const id = React.useId();
  const [password, setPassword] = React.useState('');
  const [save, setSave] = React.useState(true);
  const [pending, setPending] = React.useState(false);
  const [navigating, startNavigation] = React.useTransition();
  const [error, setError] = React.useState<string | undefined>(wrong ? "That password didn't work." : undefined);

  const submit = async () => {
    if (!password || pending || navigating) return;
    setPending(true);
    setError(undefined);
    try {
      const next = await unwrapAction(retryFileWithPassword(jobId, fileIndex, password, save));
      emitJobStarted(next.id);
      // The spinner holds until the new job's page shows.
      startNavigation(() => router.push(importJobHref(next.id)));
      setPending(false);
    } catch (e) {
      setError(
        e instanceof ActionError && e.status === 422 && e.code === 'WRONG_PASSWORD'
          ? "That password didn't work."
          : getErrorMessage(e, "Couldn't try the file again. Try again."),
      );
      setPending(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-space-8 p-space-16"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <TextField
        type="password"
        label="Statement password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError(undefined);
        }}
        error={error}
        disabled={pending || navigating}
      />
      <div className="flex items-center gap-space-8">
        <Checkbox id={id} checked={save} onCheckedChange={(c) => setSave(c === true)} disabled={pending || navigating} />
        <label htmlFor={id}>
          <Text variant="body" as="span">
            Save to this account
          </Text>
        </label>
      </div>
      <div>
        <Button type="submit" size="sm" loading={pending || navigating} disabled={!password}>
          Try again
        </Button>
      </div>
    </form>
  );
}

function FileSection({ file, jobId, fileIndex }: { file: FileSummary; jobId: string; fileIndex: number }) {
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
      {file.errorCode === 'PASSWORD_REQUIRED' || file.errorCode === 'WRONG_PASSWORD' ? (
        <PasswordRetry jobId={jobId} fileIndex={fileIndex} wrong={file.errorCode === 'WRONG_PASSWORD'} />
      ) : null}
      {file.status === 'HELD' && file.heldUploadId ? (
        <div className="p-space-16">
          <Text variant="label" as="span">
            <Button asChild variant="link" size="sm">
              <Link href={importHeldHref(file.heldUploadId)}>Pick an account</Link>
            </Button>
          </Text>
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
  const router = useAppRouter();
  const [opening, startOpening] = React.useTransition();
  const result = ingestResult(job);
  const failure = importFailureSummary(job);
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
            <JobActions job={job} pending={opening} onRetried={(retried) => startOpening(() => router.push(importJobHref(retried.id)))} />
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
          <div className={`grid grid-cols-2 ${GRID_GAP} desk:grid-cols-4`}>
            <KpiTile label="Files" value={totals.files} />
            <KpiTile label="Lines read" value={totals.lines} />
            <KpiTile label="Created" value={totals.created} />
            <KpiTile
              label="Duplicates"
              value={totals.duplicates}
              context={totals.duplicates > 0 ? 'marked for review' : undefined}
            />
          </div>
          {failure ? <Banner tone={failure.allFailed ? 'danger' : 'warning'}>{failure.text}</Banner> : null}
          {totals.duplicates > 0 ? (
            <Banner
              tone="warning"
              title={`${formatCount(totals.duplicates, ['duplicate', 'duplicates'])} found.`}
            >
              {pluralize(totals.duplicates, 'It was', 'They were')} kept and marked &quot;Duplicate&quot; so you can merge
              or dismiss {pluralize(totals.duplicates, 'it', 'them')} from{' '}
              <Button asChild variant="link">
                <Link href={appHref('/transactions')}>Transactions</Link>
              </Button>
              .
            </Banner>
          ) : null}
          {(result?.fileDetails ?? []).map((f, i) => (
            <FileSection key={`${i}-${f.filename}`} file={f} jobId={job.id} fileIndex={i} />
          ))}
        </>
      ) : null}
    </div>
  );
}
