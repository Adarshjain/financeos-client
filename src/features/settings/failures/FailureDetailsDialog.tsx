'use client';

import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { Button } from '@/components/ds/Button/Button';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { Icon } from '@/components/ds/Icon/Icon';
import { ListField } from '@/components/ds/ListField/ListField';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { Text } from '@/components/ds/Text/Text';
import { unwrapAction } from '@/lib/actionResult';
import { copyText } from '@/lib/copyText';
import { notify } from '@/lib/notify';

import { loadEmailDetail, loadJobDetail } from './failuresActions';
import {
  dateTime12,
  emailStatusLabel,
  emailTitle,
  type FailedEmail,
  type FailedJob,
  failureKeys,
  openInGmailUrl,
} from './failuresModel';

export interface DetailsAction {
  label: string;
  onSelect: () => void;
}

interface DetailsProps {
  onClose: () => void;
  /** Retry and Skip (or Dismiss), when the item allows them. */
  retry?: DetailsAction;
  second?: DetailsAction;
}

function CopyId({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-space-4 min-w-0">
      <Text mono variant="label" className="break-all">
        {value}
      </Text>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        iconOnly
        aria-label={`Copy ${label}`}
        icon={<Icon name="copy" size="sm" />}
        onClick={() =>
          void copyText(value).then((ok) => (ok ? notify.success(`${label} copied`) : notify.error("Couldn't copy. Try again.")))
        }
      />
    </span>
  );
}

function StackBlock({ stack }: { stack: string | null | undefined }) {
  if (stack === undefined) return <Skeleton height={80} />;
  if (!stack) return <Text variant="label" tone="ink-3">No stack was recorded.</Text>;
  return (
    <Text as="pre" mono variant="label" className="whitespace-pre-wrap break-all max-h-72 overflow-auto rounded-ds-md bg-sunken p-space-12">
      {stack}
    </Text>
  );
}

function Shell({
  title,
  children,
  retry,
  second,
  onClose,
}: DetailsProps & { title: string; children: React.ReactNode }) {
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="lg"
        title={title}
        tertiary={{ label: 'Close', onSelect: onClose }}
        secondary={second ? { label: second.label, onSelect: second.onSelect } : undefined}
        primary={retry ? { label: retry.label, onSelect: retry.onSelect } : undefined}
      >
        <Dialog.Body>{children}</Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}

/** Every field of one failed email, ids with copy buttons, the full error and the stack. */
export function EmailDetailsDialog({ item, ...rest }: DetailsProps & { item: FailedEmail }) {
  const { data, isError } = useQuery({
    queryKey: [...failureKeys.all, 'email-detail', item.ledgerId],
    queryFn: () => unwrapAction(loadEmailDetail(item.ledgerId)),
    placeholderData: item,
  });
  const row = data ?? item;
  const stack = isError ? null : data && data.errorDetail !== undefined && data !== item ? data.errorDetail : undefined;

  return (
    <Shell title={emailTitle(row)} {...rest}>
      {isError ? <Banner tone="danger">Couldn&apos;t load the stack. The rest is from the list.</Banner> : null}
      <ListField label="Status" value={emailStatusLabel(row)} />
      <ListField label="User" value={row.userEmail} />
      <ListField label="User id" value={<CopyId label="User id" value={row.userId} />} />
      <ListField label="Mailbox" value={row.connectionEmail} />
      <ListField label="Sender" value={row.sender ?? ''} />
      <ListField label="Subject" value={row.subject ?? ''} />
      <ListField label="Email date" value={dateTime12(row.internalDate)} />
      <ListField label="Ledger id" value={<CopyId label="Ledger id" value={row.ledgerId} />} />
      <ListField label="Gmail message id" value={<CopyId label="Gmail message id" value={row.gmailMessageId} />} />
      <ListField label="Tries" value={String(row.attemptCount)} />
      <ListField label="Next try" value={dateTime12(row.nextRetryAt)} />
      <ListField label="Processed" value={dateTime12(row.processedAt)} />
      {row.dismissedAt ? (
        <>
          <ListField label="Skipped at" value={dateTime12(row.dismissedAt)} />
          <ListField label="Skipped by" value={row.dismissedBy ?? ''} />
          <ListField label="Reason" value={row.dismissReason ?? ''} />
        </>
      ) : null}
      <ListField
        label="Gmail"
        value={
          <Button asChild variant="link" size="sm">
            <a href={openInGmailUrl(row)} target="_blank" rel="noreferrer">
              Open in Gmail
            </a>
          </Button>
        }
      />
      <div className="flex flex-col gap-space-8 pt-space-12">
        <Text variant="label" tone="ink-3">Error</Text>
        <Text variant="body" className="break-words whitespace-pre-wrap">{row.error ?? ''}</Text>
        <Text variant="label" tone="ink-3">Stack</Text>
        <StackBlock stack={stack} />
      </div>
    </Shell>
  );
}

/** Every field of one failed job, ids with copy buttons, the full error and the stack. */
export function JobDetailsDialog({ item, ...rest }: DetailsProps & { item: FailedJob }) {
  const { data, isError } = useQuery({
    queryKey: [...failureKeys.all, 'job-detail', item.id],
    queryFn: () => unwrapAction(loadJobDetail(item.id)),
    placeholderData: item,
  });
  const row = data ?? item;
  const stack = isError ? null : data && data !== item ? data.errorDetail : undefined;

  return (
    <Shell title={row.jobName} {...rest}>
      {isError ? <Banner tone="danger">Couldn&apos;t load the stack. The rest is from the list.</Banner> : null}
      <ListField label="Type" value={row.type} />
      <ListField label="User" value={row.userEmail ?? ''} />
      {row.userId ? <ListField label="User id" value={<CopyId label="User id" value={row.userId} />} /> : null}
      <ListField label="Job id" value={<CopyId label="Job id" value={row.id} />} />
      <ListField label="Error code" value={row.errorCode ?? ''} />
      <ListField label="Attempt" value={String(row.attempt)} />
      <ListField label="Started" value={dateTime12(row.startedAt)} />
      <ListField label="Finished" value={dateTime12(row.finishedAt)} />
      <ListField label="Can retry" value={row.retryable ? 'Yes' : "No, files expired"} />
      {row.dismissedAt ? (
        <>
          <ListField label="Dismissed at" value={dateTime12(row.dismissedAt)} />
          <ListField label="Dismissed by" value={row.dismissedBy ?? ''} />
          <ListField label="Reason" value={row.dismissReason ?? ''} />
        </>
      ) : null}
      <div className="flex flex-col gap-space-8 pt-space-12">
        <Text variant="label" tone="ink-3">Error</Text>
        <Text variant="body" className="break-words whitespace-pre-wrap">{row.error ?? ''}</Text>
        <Text variant="label" tone="ink-3">Stack</Text>
        <StackBlock stack={stack} />
      </div>
    </Shell>
  );
}
