'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { ConfirmDialog } from '@/components/ds/Dialog/Dialog';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Text } from '@/components/ds/Text/Text';
import { unwrapAction } from '@/lib/actionResult';
import { keys } from '@/lib/query/keys';

import { archiveAllTitle, archiveEmailLine } from './archiveAllModel';
import type { AttentionReason } from './attentionItemModel';
import { loadGmailAttention, loadGmailUngrouped } from './gmailActions';

const PAGE_SIZE = 10;

interface ArchiveAllDialogProps {
  /** The reason being archived; null keeps the dialog closed. */
  reason: AttentionReason | null;
  /** Emails in no group only (what Archive all archives from the section lists). */
  ungroupedOnly: boolean;
  /** The section's count, for the title until the list answers. */
  count?: number;
  confirming: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** "Archive N emails?": lists the mails that will be archived (subject, sender, date), page by page, before the confirm. */
export function ArchiveAllDialog({ reason, ungroupedOnly, count, confirming, onConfirm, onClose }: ArchiveAllDialogProps) {
  const [size, setSize] = useState(PAGE_SIZE);
  // A confirmed archive clears the reason without onClose, so start the next open from one page.
  const [sizeReason, setSizeReason] = useState(reason);
  if (sizeReason !== reason) {
    setSizeReason(reason);
    setSize(PAGE_SIZE);
  }
  const params = { page: 0, size, includeRetryable: false, reason: reason ?? undefined };
  const { data, isPlaceholderData, isError } = useQuery({
    queryKey: keys.settings.gmailAttention({ archiveAll: true, ungrouped: ungroupedOnly, ...params }),
    queryFn: () => unwrapAction(ungroupedOnly ? loadGmailUngrouped(params) : loadGmailAttention(params)),
    placeholderData: keepPreviousData,
    enabled: reason !== null,
  });
  const rows = data?.content ?? [];
  const total = data?.totalElements ?? count;

  return (
    <ConfirmDialog
      open={reason !== null}
      onOpenChange={(open) => {
        if (open || confirming) return;
        setSize(PAGE_SIZE);
        onClose();
      }}
      title={archiveAllTitle(total)}
      description="They move to Archived and can be unarchived one by one."
      confirmLabel="Archive all"
      tone="danger"
      confirmLoading={confirming}
      onConfirm={onConfirm}
    >
      {isError ? (
        <Text variant="body" tone="ink-3">
          Couldn&apos;t load the list of emails.
        </Text>
      ) : (
        <Card data-testid="archive-all-list">
          {rows.map((item) => {
            const line = archiveEmailLine(item);
            return <ListRow key={item.id} wrap title={line.subject} subtitle={`${line.sender} · ${line.date}`} />;
          })}
          {total != null && rows.length < total && rows.length > 0 ? (
            <Card.Row className="justify-center">
              <Text variant="label" as="span">
                <Button variant="link" size="sm" loading={isPlaceholderData} onClick={() => setSize((s) => s + PAGE_SIZE)}>
                  Show more
                </Button>
              </Text>
            </Card.Row>
          ) : null}
        </Card>
      )}
    </ConfirmDialog>
  );
}
