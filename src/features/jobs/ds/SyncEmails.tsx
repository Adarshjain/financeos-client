'use client';

import Link from 'next/link';
import React, { useState } from 'react';

import { Button, Card, CardRow, Icon, Text } from '@/components/ds';
import { dayMonth, numericDateTime } from '@/features/jobs/format';
import { MESSAGE_GROUPS, type MessageGroup, STATUS_LABELS } from '@/features/jobs/syncLabels';
import type { SyncMessageResult } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

const CONNECTIONS_HREF = '/ds/settings/connections';
const ACCOUNTS_HREF = '/ds/accounts';
const IMPORT_HREF = '/transactions/import';

function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Text variant="label" as="span">
      <Button asChild variant="link">
        <Link href={href}>{children}</Link>
      </Button>
    </Text>
  );
}

function MessageAction({ message }: { message: SyncMessageResult }) {
  switch (message.status) {
    case 'UNRESOLVED_ACCOUNT':
      return <ActionLink href={CONNECTIONS_HREF}>Assign an account in Gmail settings</ActionLink>;
    case 'ACCOUNT_NOT_OPTED_IN':
      return (
        <ActionLink href={message.accountId ? `${ACCOUNTS_HREF}/${message.accountId}` : ACCOUNTS_HREF}>
          Set ingest date
        </ActionLink>
      );
    case 'FAILED_RETRYABLE':
    case 'FAILED_PERMANENT':
      return (
        <div className="flex flex-wrap gap-x-space-8">
          {/decrypt/i.test(message.error ?? '') ? (
            <ActionLink href={ACCOUNTS_HREF}>Set the statement password on the account</ActionLink>
          ) : null}
          <ActionLink href={CONNECTIONS_HREF}>Retry from Gmail settings</ActionLink>
          {message.attachmentFilename ? <ActionLink href={IMPORT_HREF}>Import manually</ActionLink> : null}
        </div>
      );
    default:
      return null;
  }
}

function Outcome({ message }: { message: SyncMessageResult }) {
  if (message.status === 'FAILED_RETRYABLE' || message.status === 'FAILED_PERMANENT') {
    return (
      <div className="flex flex-col gap-space-2">
        <Text variant="caption" tone="danger" as="p" className="break-words">
          {message.error || 'Unknown error'}
        </Text>
        <Text variant="caption" tone="ink-3" as="p">
          Attempt {message.attemptCount}
          {message.status === 'FAILED_RETRYABLE' && message.nextRetryAt
            ? ` · next retry ${numericDateTime(message.nextRetryAt)}`
            : ''}
          {message.status === 'FAILED_PERMANENT' ? ' · no more automatic retries' : ''}
        </Text>
      </div>
    );
  }
  if (message.status === 'RECONCILED') {
    return (
      <Text variant="caption" tone="ink-2" as="p">
        {message.createdCount} new transaction{message.createdCount === 1 ? '' : 's'}, {message.matchedCount} matched to
        existing alerts
      </Text>
    );
  }
  if (message.status === 'CREATED') return null;
  return (
    <Text variant="caption" tone="ink-2" as="p" className="break-words">
      {message.error || STATUS_LABELS[message.status]}
    </Text>
  );
}

/** One email of a sync run: who sent it, which account it landed on, what happened and what to do about it. */
export function SyncMessage({ message }: { message: SyncMessageResult }) {
  const more = message.createdCount - message.transactions.length;
  return (
    <CardRow className="flex-col items-stretch" data-testid="sync-message">
      <div className="flex items-start justify-between gap-space-8">
        <div className="min-w-0">
          <Text variant="body-strong" as="p" truncate>
            {message.subject || '—'}
          </Text>
          <Text variant="caption" tone="ink-3" as="p" truncate>
            {message.sender || '—'}
          </Text>
        </div>
        <Text variant="caption" tone="ink-3" className="shrink-0">
          {dayMonth(message.receivedAt)}
        </Text>
      </div>

      {message.accountName || message.last4 || message.attachmentFilename ? (
        <div className="flex flex-wrap items-center gap-x-space-8">
          {message.accountName ? (
            message.accountId ? (
              <Text variant="caption" as="span">
                <Button asChild variant="link">
                  <Link href={`${ACCOUNTS_HREF}/${message.accountId}`}>{message.accountName}</Link>
                </Button>
              </Text>
            ) : (
              <Text variant="caption" tone="ink-2">
                {message.accountName}
              </Text>
            )
          ) : null}
          {message.last4 ? (
            <Text variant="caption" tone="ink-3">
              Card / a/c ••{message.last4}
            </Text>
          ) : null}
          {message.attachmentFilename ? (
            <Text variant="caption" tone="ink-3" truncate>
              File: {message.attachmentFilename}
            </Text>
          ) : null}
        </div>
      ) : null}

      <Outcome message={message} />

      {message.transactions.length > 0 ? (
        <ul className="flex flex-col gap-space-2">
          {message.transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-space-8">
              <Text variant="caption" tone="ink-2" truncate>
                {dayMonth(t.date)} {t.description || '—'}
              </Text>
              <Text variant="caption" tone={t.type === 'CREDIT' ? 'positive' : 'ink'} className="shrink-0">
                {t.type === 'CREDIT' ? '+' : ''}
                {formatCurrency(t.amount)}
              </Text>
            </li>
          ))}
          {more > 0 ? (
            <Text as="li" variant="caption" tone="ink-3">
              …and {more} more
            </Text>
          ) : null}
        </ul>
      ) : null}

      <MessageAction message={message} />
    </CardRow>
  );
}

function EmailGroup({ group, messages }: { group: MessageGroup; messages: SyncMessageResult[] }) {
  const [open, setOpen] = useState(group.defaultOpen);
  return (
    <Card variant="inset" data-testid="email-group" data-group={group.key}>
      <div className="p-space-4">
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          icon={<Icon name={open ? 'chevron-down' : 'chevron-right'} size="xs" />}
        >
          {group.title} ({messages.length})
        </Button>
      </div>
      {open ? messages.map((m) => <SyncMessage key={m.ledgerId} message={m} />) : null}
    </Card>
  );
}

/** Every email processed in a sync run, grouped by outcome with problems first. */
export function SyncEmails({ messages, truncated }: { messages: SyncMessageResult[]; truncated: number }) {
  if (messages.length === 0) return null;

  const grouped = new Set(MESSAGE_GROUPS.flatMap((g) => g.statuses));
  const groups: Array<{ group: MessageGroup; messages: SyncMessageResult[] }> = MESSAGE_GROUPS.map((group) => ({
    group,
    messages: messages.filter((m) => group.statuses.includes(m.status)),
  }));
  const other = messages.filter((m) => !grouped.has(m.status));
  if (other.length > 0) {
    groups.push({ group: { key: 'other', title: 'Other', statuses: [], defaultOpen: false }, messages: other });
  }

  return (
    <div className="flex flex-col gap-space-6">
      <Text variant="body-strong" as="p">
        Emails in this run
      </Text>
      {groups
        .filter((g) => g.messages.length > 0)
        .map((g) => (
          <EmailGroup key={g.group.key} group={g.group} messages={g.messages} />
        ))}
      {truncated > 0 ? (
        <Text variant="caption" tone="ink-3" as="p">
          …and {truncated} more email{truncated === 1 ? '' : 's'} not listed
        </Text>
      ) : null}
    </div>
  );
}
