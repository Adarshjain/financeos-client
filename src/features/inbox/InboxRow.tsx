'use client';

import Link from 'next/link';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Icon } from '@/components/ds/Icon/Icon';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { ContextMenu } from '@/components/ds/Menu/ContextMenu';
import { SwipeActions } from '@/components/ds/SwipeActions/SwipeActions';
import type { InboxItemResponse } from '@/lib/api/types';

import { appTodayPlus, canDismiss, canSnooze, inboxRowId } from './inboxModel';
import { type RowButton, rowButtons } from './inboxRowsModel';
import { InboxSnoozeMenu } from './InboxSnoozeMenu';

export interface InboxRowProps {
  item: InboxItemResponse;
  highlighted: boolean;
  onBillButton: (item: InboxItemResponse, button: RowButton) => void;
  onSnooze: (item: InboxItemResponse, until: string) => void;
  onDismiss: (item: InboxItemResponse) => void;
}

/**
 * One inbox row: the title and server subtitle, the row's buttons, then the
 * snooze and dismiss icons the server allows. On phone, swiping right snoozes until tomorrow and
 * swiping left dismisses.
 */
export function InboxRow({ item, highlighted, onBillButton, onSnooze, onDismiss }: InboxRowProps) {
  const snoozable = canSnooze(item);
  const dismissable = canDismiss(item);
  const buttons = rowButtons(item);

  return (
    <ContextMenu
      items={[
        ...(snoozable ? [{ id: 'snooze', label: 'Snooze', onSelect: () => onSnooze(item, appTodayPlus(1)) }] : []),
        ...(dismissable ? [{ id: 'dismiss', label: 'Dismiss', onSelect: () => onDismiss(item) }] : []),
      ]}
    >
    <SwipeActions
      disabled={!snoozable && !dismissable}
      left={
        snoozable
          ? {
              label: 'Snooze',
              icon: <Icon name="calendar" size="sm" />,
              tone: 'info',
              onTrigger: () => onSnooze(item, appTodayPlus(1)),
            }
          : undefined
      }
      right={
        dismissable
          ? {
              label: 'Dismiss',
              icon: <Icon name="close" size="sm" />,
              tone: 'danger',
              onTrigger: () => onDismiss(item),
            }
          : undefined
      }
    >
      <ListRow
        id={inboxRowId(item.key)}
        data-inbox-key={item.key}
        data-testid="inbox-row"
        wrap
        borderTop={false}
        highlighted={highlighted}
        title={item.title}
        subtitle={item.subtitle ?? undefined}
        trailing={
          <>
            {buttons.map((button) =>
              button.href ? (
                <Button key={button.id} asChild variant={button.variant} size="sm">
                  <Link href={button.href} prefetch={false}>
                    {button.label}
                  </Link>
                </Button>
              ) : (
                <Button
                  key={button.id}
                  variant={button.variant}
                  size="sm"
                  disabled={button.disabled}
                  onClick={() => onBillButton(item, button)}
                >
                  {button.label}
                </Button>
              ),
            )}
            {snoozable ? (
              <InboxSnoozeMenu title={item.title} onSnooze={(until) => onSnooze(item, until)} />
            ) : null}
            {dismissable && item.kind !== 'epf_match' ? (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={`Dismiss ${item.title}`}
                icon={<Icon name="close" size="sm" />}
                onClick={() => onDismiss(item)}
              />
            ) : null}
          </>
        }
      />
    </SwipeActions>
    </ContextMenu>
  );
}
