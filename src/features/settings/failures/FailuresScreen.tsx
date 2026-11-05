'use client';

import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { Tabs } from '@/components/ds/Tabs/Tabs';
import { Text } from '@/components/ds/Text/Text';
import { unwrapAction } from '@/lib/actionResult';
import type { Schemas } from '@/lib/api/types';

import { EmailsTab } from './EmailsTab';
import { loadFailureSummary, retryAllFailures } from './failuresActions';
import {
  countsLine,
  failureKeys,
  type FailureKind,
  type FailureSummary,
  retryAllCount,
  retryAllQuestion,
  retryAllToast,
} from './failuresModel';
import { JobsTab } from './JobsTab';
import { useFailureRunner } from './useFailureRunner';

/** Settings → Debug → Failures (admin only): the counts line, Emails and Jobs tabs, and Retry all for the open tab. */
export function FailuresScreen({
  summary: initialSummary,
  emails,
}: {
  summary: FailureSummary;
  emails: Schemas['PageFailedGmailItemResponse'];
}) {
  const [tab, setTab] = React.useState<FailureKind>('gmail');
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const run = useFailureRunner();

  const { data: summary = initialSummary } = useQuery({
    queryKey: failureKeys.summary(),
    queryFn: () => unwrapAction(loadFailureSummary()),
    initialData: initialSummary,
    staleTime: 30_000,
  });
  const count = retryAllCount(tab, summary);

  const retryAll = async () => {
    setBusy(true);
    try {
      await run(retryAllFailures(tab), (r) => retryAllToast(tab, r));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <div className="flex flex-col gap-space-2">
        <Text as="h2" variant="title">
          Failures
        </Text>
        <Text variant="label" tone="ink-3">
          {countsLine(summary)}
        </Text>
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as FailureKind)}
        items={[
          { value: 'gmail', label: 'Emails' },
          { value: 'jobs', label: 'Jobs' },
        ]}
      />
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" disabled={count === 0} onClick={() => setConfirming(true)}>
          Retry all
        </Button>
      </div>
      {tab === 'gmail' ? <EmailsTab initial={emails} /> : <JobsTab />}

      {confirming ? (
        <Dialog open onOpenChange={(open) => (open || busy ? undefined : setConfirming(false))}>
          <Dialog.Content
            size="sm"
            dismissible={!busy}
            title={retryAllQuestion(tab, count)}
            description={
              tab === 'gmail'
                ? 'Each email is queued again, and a sync runs for its mailbox.'
                : "Jobs whose files expired can't be retried and are skipped."
            }
            secondary={{ label: 'Cancel', disabled: busy, onSelect: () => setConfirming(false) }}
            primary={{ label: 'Retry all', loading: busy, onSelect: () => void retryAll() }}
          />
        </Dialog>
      ) : null}
    </div>
  );
}
