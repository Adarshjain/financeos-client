'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Text } from '@/components/ds/Text/Text';
import { unwrapAction } from '@/lib/actionResult';
import { keys } from '@/lib/query/keys';

import type { AttentionGroupModel, AttentionItem } from './attentionItemModel';
import { AttentionItemRow } from './AttentionItemRow';
import { loadGmailUngrouped } from './gmailActions';

const PAGE_SIZE = 10;

interface AttentionGroupProps {
  group: AttentionGroupModel;
  retryItem: (ledgerId: string) => void;
  onAssign: (item: AttentionItem) => void;
  onArchive: (ledgerId: string) => void;
  onUnarchive: (ledgerId: string) => void;
  onRetryAll: () => void;
  onArchiveAll: () => void;
}

/** One reason's heading (emails in no group only) with its bulk actions, and its rows (first page, then "Show more"). */
export function AttentionGroup({ group, onRetryAll, onArchiveAll, ...rowHandlers }: AttentionGroupProps) {
  const [size, setSize] = useState(PAGE_SIZE);
  const params = { page: 0, size, includeRetryable: false, reason: group.reason };
  const { data } = useQuery({
    queryKey: keys.settings.gmailAttention({ ungrouped: true, ...params }),
    queryFn: () => unwrapAction(loadGmailUngrouped(params)),
    placeholderData: keepPreviousData,
  });
  const rows = data?.content ?? [];

  return (
    <section data-testid={`attention-group-${group.reason}`}>
      <Card.Row className="items-center justify-between">
        <Text variant="body-strong" as="h3">
          {group.label} · {group.count}
        </Text>
        <div className="flex items-center gap-space-8">
          <Button variant="secondary" size="sm" onClick={onRetryAll}>
            Retry all
          </Button>
          <Button variant="secondary" size="sm" onClick={onArchiveAll}>
            Archive all
          </Button>
        </div>
      </Card.Row>
      {rows.map((item) => (
        <AttentionItemRow key={item.id} item={item} {...rowHandlers} />
      ))}
      {rows.length < group.count && rows.length > 0 ? (
        <Card.Row className="justify-center">
          <Text variant="label" as="span">
            <Button variant="link" size="sm" onClick={() => setSize((s) => s + PAGE_SIZE)}>
              Show more
            </Button>
          </Text>
        </Card.Row>
      ) : null}
    </section>
  );
}
