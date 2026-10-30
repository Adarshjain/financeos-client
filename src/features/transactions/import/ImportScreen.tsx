'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { DropZone } from '@/components/ds/DropZone/DropZone';
import { GRID_GAP } from '@/components/ds/gridGap';
import { PageFooter } from '@/components/ds/PageFooter/PageFooter';
import { Pager } from '@/components/ds/Pager/Pager';
import { Text } from '@/components/ds/Text/Text';
import { AccountPicker } from '@/components/organisms/AccountPicker/AccountPicker';
import { JobsHistory } from '@/components/organisms/JobsHistory/JobsHistory';
import { isActiveJob } from '@/features/jobs/jobModel';
import { subscribeJobStarted } from '@/features/jobs/jobsBus';
import { useJobsHistory } from '@/features/jobs/useJobsHistory';
import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';
import type { Account } from '@/lib/account.types';
import { formatCount } from '@/lib/format';
import { useAccounts } from '@/lib/query';
import { keys } from '@/lib/query/keys';
import { AccountType } from '@/lib/types';

import { TransactionsTabs } from '../TransactionsTabs';
import { formatFileSize, MAX_REQUEST_MB } from './fileLimits';
import { IMPORT_ACTIVITY_HREF, IMPORT_JOB_TYPE, importJobHref, importUrl, RECENT_IMPORTS_SIZE } from './importModel';
import { useIngestForm } from './useIngestForm';

const IMPORT_ACCOUNT_TYPES: readonly AccountType[] = [AccountType.BANK_ACCOUNT, AccountType.CREDIT_CARD];

export interface ImportScreenProps {
  initialAccounts: Account[];
  /** From `?account=`; used when that account can take statements. */
  initialAccountId?: string;
  /** Recent imports starts here (an instant); the server read it so the first paint needs no request. */
  since: string;
  /** From `?page=`: the 0-based page of Recent imports. */
  page?: number;
}

/** /transactions/import: upload statements to an account; Recent imports beside it, the running one on top. */
export function ImportScreen({ initialAccounts, initialAccountId, since, page = 0 }: ImportScreenProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: accounts = initialAccounts } = useAccounts(initialAccounts);
  const form = useIngestForm({ accounts, initialAccountId, completedMessage: 'Import finished. See it in Recent imports.' });
  const history = useJobsHistory({ page, size: RECENT_IMPORTS_SIZE, statusFilter: '', typeFilter: IMPORT_JOB_TYPE, since });
  // The newest page is where a running import sits; on page 1 it is the same query as `history`.
  const newest = useJobsHistory({ page: 0, size: RECENT_IMPORTS_SIZE, statusFilter: '', typeFilter: IMPORT_JOB_TYPE, since });
  const fileZoneRef = React.useRef<HTMLDivElement>(null);

  // A job started on this page shows in Recent imports now, not at the next poll.
  React.useEffect(
    () => subscribeJobStarted(() => void queryClient.invalidateQueries({ queryKey: keys.jobs.all })),
    [queryClient],
  );

  // An import still running (started here, before a reload, or in another tab) keeps the form locked.
  const locked = form.isUploading || newest.jobs.some((j) => isActiveJob(j.status));

  // The app bar's +: open the file picker. A locked form's input is disabled, so this then does nothing.
  const chooseFiles = () => fileZoneRef.current?.querySelector<HTMLInputElement>('input[type="file"]')?.click();

  const pager = (
    <Pager
      variant="compact"
      page={page}
      size={RECENT_IMPORTS_SIZE}
      totalElements={history.totalElements}
      totalPages={history.totalPages}
      unit="imports"
      onPageChange={(p) => router.push(importUrl({ page: p, account: initialAccountId }), { scroll: false })}
    />
  );

  const queued = form.files.map((f, i) => ({ id: `${i}-${f.name}`, name: f.name, size: formatFileSize(f.size) }));
  const count = form.files.length;
  const label = locked
    ? form.isSending
      ? 'Uploading files…'
      : 'Processing statements…'
    : count > 0
      ? `Upload & process ${formatCount(count, ['file', 'files'])}`
      : 'Upload & process';

  return (
    <ShellPage
      crumb={subCrumb('transactions', 'Import')}
      title="Import"
      flushTop
      onAdd={chooseFiles}
      addLabel="Add statements"
    >
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <TransactionsTabs />
        <div className={`grid grid-cols-1 items-start ${GRID_GAP} desk:grid-cols-12`}>
          <Card className="desk:col-span-7">
            <form
              onSubmit={form.handleSubmit}
              className="flex flex-col gap-space-8 desk:gap-space-16 p-space-16 desk:p-space-20"
              data-testid="import-form"
            >
              <AccountPicker
                label="Account"
                placeholder="Choose an account…"
                accounts={form.uploadableAccounts}
                types={IMPORT_ACCOUNT_TYPES}
                value={form.selectedAccountId || null}
                onValueChange={(v) => form.setSelectedAccountId(v ?? '')}
                disabled={locked}
              />
              <DropZone
                ref={fileZoneRef}
                title="Add statements"
                hint={`PDF, XLSX or XLS · up to ${MAX_REQUEST_MB} MB per upload`}
                buttonLabel="Choose files"
                accept=".pdf,.xlsx,.xls"
                disabled={locked}
                onFilesSelected={form.addFiles}
                queuedFiles={queued}
                onRemoveFile={(f) => form.removeFile(queued.findIndex((q) => q.id === f.id))}
              />
              {/* Flush with the card's edges (the card clips its corners), not a band inside its padding. */}
              <PageFooter
                className="-mx-space-16 desk:-mx-space-20 -mb-space-16 desk:-mb-space-20"
                secondary={count > 0 ? { label: 'Clear', onSelect: form.clearAllFiles, disabled: locked } : undefined}
                primary={{
                  label,
                  type: 'submit',
                  loading: locked,
                  disabled: !form.selectedAccountId || count === 0 || locked,
                }}
              />
            </form>
          </Card>
          <Card
            className="desk:col-span-5"
            title="Recent imports"
            subtitle="Last 30 days"
            action={
              <Text variant="label" as="span">
                <Button asChild variant="link" size="sm">
                  <Link href={IMPORT_ACTIVITY_HREF}>Activity</Link>
                </Button>
              </Text>
            }
          >
            <JobsHistory
              compact
              pager={pager}
              jobs={history.jobs}
              loading={history.isPending}
              skeletonRows={RECENT_IMPORTS_SIZE}
              openHref={(job) => importJobHref(job.id)}
              onOpen={(job) => router.push(importJobHref(job.id))}
              empty={
                <Text variant="body" tone="ink-3" as="p" className="p-space-16">
                  No statement imports yet
                </Text>
              }
            />
          </Card>
        </div>
      </div>
    </ShellPage>
  );
}
