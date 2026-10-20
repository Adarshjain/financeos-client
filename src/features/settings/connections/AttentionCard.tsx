'use client';

import React, { useEffect, useRef, useState } from 'react';

import { Button, Card, CardEmpty, Pager, Text } from '@/components/ds';
import type { Schemas } from '@/lib/api/types';

import { AssignDialog } from './AssignDialog';
import type { AttentionItem } from './attentionItem.helpers';
import { AttentionItemRow } from './AttentionItemRow';

type PagedAttention = Schemas['PageGmailAttentionItemResponse'];

/** Anchor id of the card; the attention push deep-links to `?focus=attention`. */
export const ATTENTION_ANCHOR = 'attention';

interface AttentionCardProps {
  attentionData: PagedAttention;
  attentionPage: number;
  onPageChange: (page: number) => void;
  archivedData: PagedAttention | null;
  archivedPage: number;
  onArchivedPageChange: (page: number) => void;
  onRetryItem: (ledgerId: string) => void;
  onArchive: (ledgerId: string) => void;
  onUnarchive: (ledgerId: string) => void;
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
  attentionData,
  attentionPage,
  onPageChange,
  archivedData,
  archivedPage,
  onArchivedPageChange,
  onRetryItem,
  onArchive,
  onUnarchive,
  autoScroll = false,
}: AttentionCardProps) {
  const [assigning, setAssigning] = useState<AttentionItem | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const activeCount = attentionData.totalElements;
  const archivedCount = archivedData?.totalElements ?? 0;
  // An emptied archive resets the view, so a later archive does not open it unasked.
  if (showArchived && archivedCount === 0) setShowArchived(false);
  // Unarchiving the last item empties the archive: fall back to the active list.
  const archivedView = showArchived && archivedCount > 0 && archivedData !== null;

  useEffect(() => {
    if (autoScroll) cardRef.current?.scrollIntoView({ block: 'start' });
  }, [autoScroll]);

  const data = archivedView ? archivedData : attentionData;
  const page = archivedView ? archivedPage : attentionPage;
  const go = archivedView ? onArchivedPageChange : onPageChange;
  const rowHandlers = { onRetryItem, onAssign: setAssigning, onArchive, onUnarchive };

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
        {data.content.length === 0 ? (
          <CardEmpty>Nothing needs attention right now.</CardEmpty>
        ) : (
          <>
            <ListPager data={data} page={page} onPageChange={go} position="top" />
            {data.content.map((item) => (
              <AttentionItemRow key={item.id} item={item} {...rowHandlers} />
            ))}
            <ListPager data={data} page={page} onPageChange={go} position="bottom" />
          </>
        )}
      </Card>

      <AssignDialog item={assigning} onClose={() => setAssigning(null)} />
    </>
  );
}
