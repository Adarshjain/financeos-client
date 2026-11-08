'use client';

import Link from 'next/link';
import React, { useState } from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { ListField } from '@/components/ds/ListField/ListField';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';
import { formatDate, formatDateTime } from '@/lib/format';

import { attentionEditTarget, attentionHintLink, type AttentionItem, describeAttentionItem, gmailMessageUrl } from './attentionItemModel';
import { EditAccountHint } from './EditAccountHint';
import { LockedStatementHint } from './LockedStatementHint';
import { usePendingAction } from './usePendingAction';
import { ViewEmailDialog } from './ViewEmailDialog';

interface AttentionItemRowProps {
  item: AttentionItem;
  retryItem: (ledgerId: string) => Promise<void> | void;
  onAssign: (item: AttentionItem) => void;
  onArchive: (ledgerId: string) => Promise<void> | void;
  onUnarchive: (ledgerId: string) => Promise<void> | void;
}

/** The detail card of one email: mailbox, sender, dates, error and the links to view it here or open it in Gmail. */
export function Details({ item, archived }: { item: AttentionItem; archived: boolean }) {
  const [viewing, setViewing] = useState(false);
  return (
    <Card variant="inset" data-testid="attention-details">
      <ListField label="Mailbox" value={item.connectionEmail} />
      <ListField label="From" value={item.senderAddress || '—'} />
      <ListField label="Email date" value={formatDateTime(item.internalDate) || '—'} />
      {item.extractedLast4 ? <ListField label="Card" value={`••${item.extractedLast4}`} /> : null}
      {item.accountName ? <ListField label="Account" value={item.accountName} /> : null}
      <ListField label="First seen" value={formatDateTime(item.discoveredAt) || '—'} />
      <ListField label="Last tried" value={formatDateTime(item.processedAt) || '—'} />
      {item.attemptCount > 0 ? <ListField label="Attempts" value={item.attemptCount} /> : null}
      {archived ? <ListField label="Archived" value={formatDateTime(item.archivedAt) || '—'} /> : null}
      <ListField
        label="Error"
        value={
          <Text variant="body" mono>
            {item.error || '—'}
          </Text>
        }
      />
      <ListField
        label="Email"
        value={
          <span className="inline-flex flex-wrap items-center gap-x-space-12 gap-y-space-4">
            <Button variant="link" onClick={() => setViewing(true)}>
              View email
            </Button>
            <Button asChild variant="link">
              <a href={gmailMessageUrl(item)} target="_blank" rel="noopener noreferrer">
                Open in Gmail
              </a>
            </Button>
          </span>
        }
      />
      {viewing ? <ViewEmailDialog ledgerId={item.id} subject={item.subject} onClose={() => setViewing(false)} /> : null}
    </Card>
  );
}

/** One Gmail item that could not become a transaction: what happened, the next step, details and actions. */
export function AttentionItemRow({ item, retryItem, onAssign, onArchive, onUnarchive }: AttentionItemRowProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { pending, run } = usePendingAction();
  const { label, summary, hint } = describeAttentionItem(item);
  const hintLink = attentionHintLink(item);
  const editTarget = attentionEditTarget(item);
  const archived = Boolean(item.archivedAt);
  const emailDate = item.internalDate ?? item.discoveredAt;

  return (
    <Card.Row
      data-testid="attention-item"
      className="flex-col items-stretch desk:flex-row desk:items-start desk:justify-between"
    >
      <div className="flex flex-col gap-space-4 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-space-8 gap-y-space-4">
          <StatusWord tone="warning">{label}</StatusWord>
          <Text variant="caption" tone="ink-3" className="break-all">
            {formatDate(emailDate, 'list')}
            {item.senderAddress ? ` · ${item.senderAddress}` : ''}
          </Text>
        </div>
        <Text variant="body-strong" as="p" className="break-words">
          {item.subject || '(no subject)'}
        </Text>
        <Text variant="body" tone="ink-2" as="p">
          {summary}
        </Text>
        {hintLink && editTarget ? (
          <EditAccountHint accountId={editTarget.accountId} focusField={editTarget.focusField} label={hintLink.label} href={hintLink.href} />
        ) : hintLink && item.reason === 'LOCKED_STATEMENT' ? (
          <LockedStatementHint label={hintLink.label} href={hintLink.href} />
        ) : hintLink ? (
          <Text variant="label" as="span">
            <Button asChild variant="link">
              <Link href={hintLink.href}>{hintLink.label}</Link>
            </Button>
          </Text>
        ) : (
          <Text variant="caption" tone="ink-3" as="p">
            {hint}
          </Text>
        )}
        <div>
          <Text variant="label" as="span">
            <Button variant="link" size="sm" aria-expanded={showDetails} onClick={() => setShowDetails((v) => !v)}>
              {showDetails ? 'Hide details' : 'Details'}
            </Button>
          </Text>
        </div>
        {showDetails ? <Details item={item} archived={archived} /> : null}
      </div>

      <div className="flex flex-wrap items-center gap-space-8 desk:shrink-0 desk:justify-end">
        {archived ? (
          <Button variant="secondary" size="sm" loading={pending === 'unarchive'} disabled={pending !== null} onClick={() => run('unarchive', () => onUnarchive(item.id))}>
            Unarchive
          </Button>
        ) : (
          <>
            {item.status === 'UNRESOLVED_ACCOUNT' && item.extractedLast4 ? (
              <Button variant="secondary" size="sm" onClick={() => onAssign(item)}>
                Assign
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" loading={pending === 'retry'} disabled={pending !== null} onClick={() => run('retry', () => retryItem(item.id))}>
              Retry
            </Button>
            <Button variant="secondary" size="sm" loading={pending === 'archive'} disabled={pending !== null} onClick={() => run('archive', () => onArchive(item.id))}>
              Archive
            </Button>
          </>
        )}
      </div>
    </Card.Row>
  );
}
