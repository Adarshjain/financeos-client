'use client';

import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { ConfirmDialog } from '@/components/ds/Dialog/Dialog';
import { Pager } from '@/components/ds/Pager/Pager';
import { Text } from '@/components/ds/Text/Text';
import type { AttentionGroupsResponse, IgnoredNumber, Schemas, UnknownNumberGroup } from '@/lib/api/types';

import { AssignDialog } from './AssignDialog';
import { AssignNumberDialog } from './AssignNumberDialog';
import { AttentionGroup } from './AttentionGroup';
import { IgnoredNumberRow, ImportOffRow, UnknownNumberRow } from './AttentionGroupRows';
import { type AttentionItem, type AttentionReason, type AttentionReasonCount, groupAttention, REASON_LABELS } from './attentionItemModel';
import { AttentionItemRow } from './AttentionItemRow';

type PagedAttention = Schemas['PageGmailAttentionItemResponse'];

/** Anchor id of the card; the attention push deep-links to `?focus=attention`. */
export const ATTENTION_ANCHOR = 'attention';

interface AttentionCardProps {
  /** Unknown numbers, accounts with import off, and ignored numbers. */
  groups: AttentionGroupsResponse;
  /** Count per reason of the emails in no group (zero-count reasons omitted); they are listed per reason. */
  ungroupedSummary: AttentionReasonCount[];
  archivedData: PagedAttention | null;
  archivedPage: number;
  onArchivedPageChange: (page: number) => void;
  retryItem: (ledgerId: string) => void;
  onArchive: (ledgerId: string) => void;
  onUnarchive: (ledgerId: string) => void;
  onRetryAll: (reason: AttentionReason) => void;
  onArchiveAll: (reason: AttentionReason) => void;
  onIgnoreNumber: (group: UnknownNumberGroup) => void;
  onUnignoreNumber: (row: IgnoredNumber) => void;
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
  groups,
  ungroupedSummary,
  archivedData,
  archivedPage,
  onArchivedPageChange,
  retryItem,
  onArchive,
  onUnarchive,
  onRetryAll,
  onArchiveAll,
  onIgnoreNumber,
  onUnignoreNumber,
  autoScroll = false,
}: AttentionCardProps) {
  const [assigning, setAssigning] = useState<AttentionItem | null>(null);
  const [addingNumber, setAddingNumber] = useState<UnknownNumberGroup | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const reasonGroups = groupAttention(ungroupedSummary);
  const ungroupedCount = reasonGroups.reduce((n, g) => n + g.count, 0);
  const activeCount = groups.unknownNumbers.length + groups.importOff.length + ungroupedCount;
  const [confirmArchive, setConfirmArchive] = useState<AttentionReason | null>(null);
  const archivedCount = archivedData?.totalElements ?? 0;
  const ignoredCount = groups.ignored.length;
  const hasArchive = archivedCount > 0 || ignoredCount > 0;
  // An emptied archive resets the view, so a later archive does not open it unasked.
  if (showArchived && !hasArchive) setShowArchived(false);
  // Unarchiving the last item empties the archive: fall back to the active list.
  const archivedView = showArchived && hasArchive;
  // Ignored numbers' mail is in the archived list too, so the label counts those emails once.
  const archiveTotal = archivedCount || ignoredCount;

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
        title={archivedView ? `Archived · ${archiveTotal}` : activeCount > 0 ? `Needs attention · ${activeCount}` : 'Needs attention'}
        subtitle={archivedView ? 'Kept out of Needs attention' : 'Emails that could not become transactions'}
        action={
          archivedView ? (
            <Text variant="label" as="span">
              <Button variant="link" size="sm" onClick={() => setShowArchived(false)}>
                Back to needs attention
              </Button>
            </Text>
          ) : hasArchive ? (
            <Text variant="label" as="span">
              <Button variant="link" size="sm" onClick={() => setShowArchived(true)}>
                Archived · {archiveTotal}
              </Button>
            </Text>
          ) : undefined
        }
      >
        {archivedView ? (
          <>
            {ignoredCount > 0 ? (
              <>
                <Card.Section>Ignored numbers · {ignoredCount}</Card.Section>
                {groups.ignored.map((row) => (
                  <IgnoredNumberRow key={row.id} row={row} onStop={onUnignoreNumber} />
                ))}
              </>
            ) : null}
            {archivedData && archivedCount > 0 ? (
              <>
                {ignoredCount > 0 ? <Card.Section>Archived emails · {archivedCount}</Card.Section> : null}
                <ListPager data={archivedData} page={archivedPage} onPageChange={onArchivedPageChange} position="top" />
                {archivedData.content.map((item) => (
                  <AttentionItemRow key={item.id} item={item} {...rowHandlers} />
                ))}
                <ListPager data={archivedData} page={archivedPage} onPageChange={onArchivedPageChange} position="bottom" />
              </>
            ) : null}
          </>
        ) : activeCount === 0 ? (
          <Card.Empty>Nothing needs attention right now.</Card.Empty>
        ) : (
          <>
            {groups.unknownNumbers.length > 0 ? (
              <section data-testid="attention-numbers">
                <Card.Section>Unknown numbers · {groups.unknownNumbers.length}</Card.Section>
                {groups.unknownNumbers.map((g) => (
                  <UnknownNumberRow key={`${g.bank ?? ''}:${g.last4}`} group={g} onAdd={setAddingNumber} onIgnore={onIgnoreNumber} />
                ))}
              </section>
            ) : null}
            {groups.importOff.length > 0 ? (
              <section data-testid="attention-import-off-group">
                <Card.Section>Gmail import off · {groups.importOff.length}</Card.Section>
                {groups.importOff.map((g) => (
                  <ImportOffRow key={g.accountId} group={g} />
                ))}
              </section>
            ) : null}
            {reasonGroups.map((group) => (
              <AttentionGroup
                key={group.reason}
                group={group}
                {...rowHandlers}
                onRetryAll={() => onRetryAll(group.reason)}
                onArchiveAll={() => setConfirmArchive(group.reason)}
              />
            ))}
          </>
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
      <AssignNumberDialog group={addingNumber} onClose={() => setAddingNumber(null)} />
    </>
  );
}
