'use client';

import React, { useState } from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { ListField } from '@/components/ds/ListField/ListField';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';
import { formatDate, formatDateTime } from '@/lib/format';

import { type AttentionItem, describeAttentionItem, gmailMessageUrl } from './attentionItemModel';

interface AttentionItemRowProps {
  item: AttentionItem;
  retryItem: (ledgerId: string) => void;
  onAssign: (item: AttentionItem) => void;
  onArchive: (ledgerId: string) => void;
  onUnarchive: (ledgerId: string) => void;
}

function Details({ item, archived }: { item: AttentionItem; archived: boolean }) {
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
          <Button asChild variant="link">
            <a href={gmailMessageUrl(item)} target="_blank" rel="noopener noreferrer">
              Open in Gmail
            </a>
          </Button>
        }
      />
    </Card>
  );
}

/** One Gmail item that could not become a transaction: what happened, the next step, details and actions. */
export function AttentionItemRow({ item, retryItem, onAssign, onArchive, onUnarchive }: AttentionItemRowProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { label, summary, hint } = describeAttentionItem(item);
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
        <Text variant="caption" tone="ink-3" as="p">
          {hint}
        </Text>
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
          <Button variant="secondary" size="sm" onClick={() => onUnarchive(item.id)}>
            Unarchive
          </Button>
        ) : (
          <>
            {item.status === 'UNRESOLVED_ACCOUNT' && item.extractedLast4 ? (
              <Button variant="secondary" size="sm" onClick={() => onAssign(item)}>
                Assign
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" onClick={() => retryItem(item.id)}>
              Retry
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onArchive(item.id)}>
              Archive
            </Button>
          </>
        )}
      </div>
    </Card.Row>
  );
}
