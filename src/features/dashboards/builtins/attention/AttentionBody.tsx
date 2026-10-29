'use client';

// attention (the Inbox on Home): the most urgent few rows, no actions of their own. Each whole row
// is one link that opens that item in the Inbox (the counts are the widget subtitle).

import Link from 'next/link';
import React from 'react';

import { EmptyState, ListRow } from '@/components/ds';
import { appHref } from '@/features/shell/routes';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { useInbox } from '@/lib/query/hooks/useInbox';

import { BuiltinError } from '../BuiltinParts';
import type { BuiltinBodyProps } from '../types';
import { inboxItemHref, inboxWidgetRows } from './attentionRows';
import { AttentionSkeleton } from './AttentionSkeleton';

export function AttentionBody({ className }: BuiltinBodyProps) {
  const { data, isLoading, error, refetch } = useInbox();

  const items = data?.items ?? [];
  const rows = inboxWidgetRows(items);

  let body: React.ReactNode;
  if (isLoading) {
    body = <AttentionSkeleton />;
  } else if (error) {
    body = <BuiltinError message={getErrorMessage(error, "Couldn't load your inbox.")} action={{ label: 'Retry', onSelect: () => void refetch() }} />;
  } else if (rows.length === 0) {
    body = <EmptyState compact title="All clear" description="Nothing needs you right now." />;
  } else {
    body = (
      <>
        {rows.map((item) => (
          <ListRow key={item.key} asChild data-testid="inbox-widget-row" wrap title={item.title} subtitle={item.subtitle ?? undefined}>
            <Link href={appHref(inboxItemHref(item.key))} prefetch={false} />
          </ListRow>
        ))}
      </>
    );
  }
  return (
    <div className={className} data-testid="inbox-widget">
      {body}
    </div>
  );
}
