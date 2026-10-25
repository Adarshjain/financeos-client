'use client';

// attention (the Inbox on Home): the most urgent few rows with
// their primary action inline (the counts are the widget subtitle, the full Inbox is the header link). Bill actions open the same dialogs as the Inbox
// page.

import Link from 'next/link';
import React from 'react';

import { Button, EmptyState, ListRow } from '@/components/ds';
import type { PendingBillAction } from '@/features/inbox/inboxBillAction';
import { InboxBillHost } from '@/features/inbox/InboxBillHost';
import { pendingFor, type RowButton, rowButtons } from '@/features/inbox/inboxRows';
import { appHref } from '@/features/shell/routes';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { InboxItemResponse } from '@/lib/api/types';
import { useInbox } from '@/lib/query/hooks/useInbox';

import { BuiltinError } from '../BuiltinParts';
import type { BuiltinBodyProps } from '../types';
import { inboxItemHref, inboxWidgetRows } from './attentionRows';
import { AttentionSkeleton } from './AttentionSkeleton';

/** The row's single primary action: a link, or a bill dialog. */
function RowAction({ button, onBill }: { button: RowButton; onBill: () => void }) {
  if (button.href) {
    return (
      <Button variant={button.variant} size="sm" asChild>
        <Link href={button.href} prefetch={false}>
          {button.label}
        </Link>
      </Button>
    );
  }
  return (
    <Button variant={button.variant} size="sm" disabled={button.disabled} onClick={onBill}>
      {button.label}
    </Button>
  );
}

export function AttentionBody({ className }: BuiltinBodyProps) {
  const { data, isLoading, error, refetch } = useInbox();
  const [pendingBill, setPendingBill] = React.useState<PendingBillAction | null>(null);
  const closeBill = React.useCallback(() => setPendingBill(null), []);

  const items = data?.items ?? [];
  const rows = inboxWidgetRows(items);

  const onBill = (item: InboxItemResponse, button: RowButton) => {
    const pending = pendingFor(item, button);
    if (pending) setPendingBill(pending);
  };

  let body: React.ReactNode;
  if (isLoading) {
    body = <AttentionSkeleton />;
  } else if (error) {
    body = <BuiltinError message={getErrorMessage(error, 'request failed')} action={{ label: 'Retry', onSelect: () => void refetch() }} />;
  } else if (rows.length === 0) {
    body = <EmptyState compact title="All clear" description="Nothing needs you right now" />;
  } else {
    body = (
      <>
        {rows.map((item) => {
          const button = rowButtons(item)[0];
          return (
            <ListRow
              key={item.key}
              data-testid="inbox-widget-row"
              wrap
              title={
                <Button variant="link" asChild>
                  <Link href={appHref(inboxItemHref(item.key))} prefetch={false}>
                    {item.title}
                  </Link>
                </Button>
              }
              subtitle={item.subtitle ?? undefined}
              trailing={button ? <RowAction button={button} onBill={() => onBill(item, button)} /> : null}
            />
          );
        })}
      </>
    );
  }
  return (
    <div className={className} data-testid="inbox-widget">
      {body}
      <InboxBillHost pending={pendingBill} onClose={closeBill} />
    </div>
  );
}
