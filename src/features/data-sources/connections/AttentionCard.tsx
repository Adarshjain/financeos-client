'use client';

import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { ConfirmDialog } from '@/components/ds/Dialog/Dialog';
import { Pager } from '@/components/ds/Pager/Pager';
import { Text } from '@/components/ds/Text/Text';
import type { Schemas } from '@/lib/api/types';

import { AssignDialog } from './AssignDialog';
import { AttentionGroup } from './AttentionGroup';
import { type AttentionItem, type AttentionReason, type AttentionReasonCount, groupAttention, REASON_LABELS } from './attentionItemModel';
import { AttentionItemRow } from './AttentionItemRow';

type PagedAttention = Schemas['PageGmailAttentionItemResponse'];

/** Anchor id of the card; the attention push deep-links to `?focus=attention`. */
export const ATTENTION_ANCHOR = 'attention';

interface AttentionCardProps {
  /** Count per reason (zero-count reasons omitted); the active list is grouped by it. */
  summary: AttentionReasonCount[];
  archivedData: PagedAttention | null;
  archivedPage: number;
  onArchivedPageChange: (page: number) => void;
  retryItem: (ledgerId: string) => void;
  onArchive: (ledgerId: string) => void;
  onUnarchive: (ledgerId: string) => void;
  onRetryAll: (reason: AttentionReason) => void;
  onArchiveAll: (reason: AttentionReason) => void;
  /** Opened from the "needs attention" push: scroll the card into view. */
  autoScroll?: boolean;
}

function ListPager({
  data,
  page,
  onPageChange,
  position,
}: {
  data: PagedAttention;
  page: number;
  onPageChange: (page: number) => void;
  position: 'top' | 'bottom';
}) {
  if (data.totalPages <= 1) return null;
  return (
    <Pager
      page={page}
      size={data.size}
      totalElements={data.totalElements}
      totalPages={data.totalPages}
      summary={({ start, end, total }) => `${start}–${end} of ${total}`}
      onPageChange={onPageChange}
      borderPosition={position === 'top' ? 'bottom' : 'top'}
    />
  );
}

/** Gmail emails that could not become transactions, with an Archived view in the same card. */
export function AttentionCard({
  summary,
  archivedData,
  archivedPage,
  onArchivedPageChange,
  retryItem,
  onArchive,
  onUnarchive,
  onRetryAll,
  onArchiveAll,
  autoScroll = false,
}: AttentionCardProps) {
  const [assigning, setAssigning] = useState<AttentionItem | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const groups = groupAttention(summary);
  const activeCount = groups.reduce((n, g) => n + g.count, 0);
  const [confirmArchive, setConfirmArchive] = useState<AttentionReason | null>(null);
  const archivedCount = archivedData?.totalElements ?? 0;
  // An emptied archive resets the view, so a later archive does not open it unasked.
  if (showArchived && archivedCount === 0) setShowArchived(false);
  // Unarchiving the last item empties the archive: fall back to the active list.
  const archivedView = showArchived && archivedCount > 0 && archivedData !== null;

  useEffect(() => {
    if (autoScroll) cardRef.current?.scrollIntoView({ block: 'start' });
  }, [autoScroll]);

  const rowHandlers = { retryItem, onAssign: setAssigning, onArchive, onUnarchive };

  return (
    <>
      <Card
        ref={cardRef}
        id={ATTENTION_ANCHOR}
        className="scroll-mt-4"
        title={archivedView ? `Archived · ${archivedCount}` : activeCount > 0 ? `Needs attention · ${activeCount}` : 'Needs attention'}
        subtitle={archivedView ? 'Kept out of Needs attention' : 'Emails that could not become transactions'}
        action={
          archivedView ? (
            <Text variant="label" as="span">
              <Button variant="link" size="sm" onClick={() => setShowArchived(false)}>
                Back to needs attention
              </Button>
            </Text>
          ) : archivedCount > 0 ? (
            <Text variant="label" as="span">
              <Button variant="link" size="sm" onClick={() => setShowArchived(true)}>
                Archived · {archivedCount}
              </Button>
            </Text>
          ) : undefined
        }
      >
        {archivedView ? (
          <>
            <ListPager data={archivedData} page={archivedPage} onPageChange={onArchivedPageChange} position="top" />
            {archivedData.content.map((item) => (
              <AttentionItemRow key={item.id} item={item} {...rowHandlers} />
            ))}
            <ListPager data={archivedData} page={archivedPage} onPageChange={onArchivedPageChange} position="bottom" />
          </>
        ) : groups.length === 0 ? (
          <Card.Empty>Nothing needs attention right now.</Card.Empty>
        ) : (
          groups.map((group) => (
            <AttentionGroup
              key={group.reason}
              group={group}
              {...rowHandlers}
              onRetryAll={() => onRetryAll(group.reason)}
              onArchiveAll={() => setConfirmArchive(group.reason)}
            />
          ))
        )}
      </Card>

      <ConfirmDialog
        open={confirmArchive !== null}
        onOpenChange={(open) => (open ? undefined : setConfirmArchive(null))}
        title={confirmArchive ? `Archive all "${REASON_LABELS[confirmArchive]}" items?` : 'Archive all?'}
        description="They move to Archived and can be unarchived one by one."
        confirmLabel="Archive all"
        tone="danger"
        onConfirm={() => {
          if (confirmArchive) onArchiveAll(confirmArchive);
          setConfirmArchive(null);
        }}
      />

      <AssignDialog item={assigning} onClose={() => setAssigning(null)} />
    </>
  );
}
