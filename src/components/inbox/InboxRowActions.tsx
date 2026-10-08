'use client';

import { X } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type { InboxActionResponse, InboxItemResponse } from '@/lib/api/types';

import { actionHref, canDismiss, canSnooze, isBillAction, primaryActions } from './inbox.helpers';
import { SnoozeMenu } from './SnoozeMenu';

export interface InboxRowHandlers {
  onBillAction: (item: InboxItemResponse, action: InboxActionResponse) => void;
  onSnooze: (item: InboxItemResponse, until: string) => void;
  onDismiss: (item: InboxItemResponse) => void;
}

interface InboxRowActionsProps extends InboxRowHandlers {
  item: InboxItemResponse;
  /** Summary rows show a single primary action. */
  limit?: number;
}

/**
 * The row's decision buttons: bill actions open the shared bill dialogs, everything else
 * (open, reconnect, upload, review, retry, approve_suggested) links to the page that handles it.
 */
export function InboxRowActions({ item, limit, onBillAction }: InboxRowActionsProps) {
  const actions = primaryActions(item).slice(0, limit ?? undefined);
  return (
    <>
      {actions.map((action, index) => {
        const variant = index === 0 ? 'primary' : 'outline';
        if (isBillAction(action.type)) {
          return (
            <Button
              key={`${action.type}-${index}`}
              variant={variant}
              size="xs"
              onClick={() => onBillAction(item, action)}
              disabled={!action.payload?.statementId}
            >
              {action.label}
            </Button>
          );
        }
        const href = actionHref(action, item);
        if (!href) return null;
        return (
          <Button key={`${action.type}-${index}`} asChild variant={variant} size="xs">
            <Link href={href}>{action.label}</Link>
          </Button>
        );
      })}
    </>
  );
}

/** Snooze (item rows only) and dismiss, when the server offers them for this row. */
export function InboxRowControls({ item, onSnooze, onDismiss }: Omit<InboxRowHandlers, 'onBillAction'> & { item: InboxItemResponse }) {
  const snoozable = canSnooze(item);
  const dismissable = canDismiss(item);
  if (!snoozable && !dismissable) return null;
  return (
    <div className="ml-auto flex items-center gap-0.5">
      {snoozable && <SnoozeMenu title={item.title} onSnooze={(until) => onSnooze(item, until)} />}
      {dismissable && (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Dismiss ${item.title}`}
          title="Dismiss"
          onClick={() => onDismiss(item)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
