'use client';

import Link from 'next/link';
import React from 'react';

import { Badge } from '@/components/ds/Badge/Badge';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { appHref } from '@/features/shell/routes';
import type { InboxItemResponse } from '@/lib/api/types';
import { formatDate } from '@/lib/format/date';
import { formatMoney } from '@/lib/format/money';

export interface InboxRowProps {
  item: InboxItemResponse;
}

/**
 * One inbox row: what needs attention, as a single link to the page where it is decided. The Inbox only points,
 * so a row has no buttons, menu, snooze or dismiss.
 */
export function InboxRow({ item }: InboxRowProps) {
  const grouped = typeof item.count === 'number' && item.count > 1;
  const trailing =
    grouped || item.date || (item.amount !== null && item.amount !== undefined) ? (
      <>
        {item.amount !== null && item.amount !== undefined ? formatMoney(item.amount) : null}
        {item.date ? formatDate(item.date, 'list') : null}
        {grouped ? <Badge tone="neutral">{item.count}</Badge> : null}
      </>
    ) : undefined;

  return (
    <ListRow
      asChild
      data-inbox-key={item.key}
      data-testid="inbox-row"
      wrap
      borderTop={false}
      title={item.title}
      subtitle={item.subtitle ?? undefined}
      trailing={trailing}
    >
      <Link href={appHref(item.href ?? '/inbox')} prefetch={false} />
    </ListRow>
  );
}
