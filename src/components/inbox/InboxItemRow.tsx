'use client';

import { Clock, X } from 'lucide-react';

import { type SwipeAction, SwipeActionRow } from '@/components/ui/swipe-action-row';
import type { InboxItemResponse } from '@/lib/api/types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

import { appTodayPlus, canDismiss, canSnooze, severityStripeClass } from './inbox.helpers';
import { InboxRowActions, InboxRowControls, type InboxRowHandlers } from './InboxRowActions';

interface InboxItemRowProps extends InboxRowHandlers {
  item: InboxItemResponse;
  highlighted: boolean;
}

/** DOM id for a row, so the ?item= deep link can scroll to it. */
export function inboxRowId(key: string): string {
  return `inbox-row-${key}`;
}

const HIGHLIGHT = 'bg-emerald-50/60 dark:bg-emerald-950/20 ring-1 ring-inset ring-emerald-500/40';

/**
 * One decision: title, context, amount and date, with the row's actions inline. On touch,
 * swiping right snoozes until tomorrow and swiping left dismisses (when the row allows them).
 */
export function InboxItemRow({ item, highlighted, onBillAction, onSnooze, onDismiss }: InboxItemRowProps) {
  const leading: SwipeAction | undefined = canSnooze(item)
    ? { label: 'Snooze', icon: Clock, tone: 'success', onCommit: () => onSnooze(item, appTodayPlus(1)) }
    : undefined;
  const trailing: SwipeAction | undefined = canDismiss(item)
    ? { label: 'Dismiss', icon: X, tone: 'danger', onCommit: () => onDismiss(item) }
    : undefined;

  return (
    <li id={inboxRowId(item.key)} data-inbox-key={item.key} data-testid="inbox-item-row">
      <SwipeActionRow leading={leading} trailing={trailing}>
        <div className={cn('relative bg-white dark:bg-slate-900 py-3 pl-5 pr-4', highlighted && HIGHLIGHT)}>
          <span
            aria-hidden="true"
            className={cn('absolute left-0 top-0 bottom-0 w-1', severityStripeClass(item.severity))}
          />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white break-words">{item.title}</p>
              {item.subtitle && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 break-words">{item.subtitle}</p>
              )}
            </div>
            {(item.amount != null || item.date) && (
              <div className="shrink-0 text-right">
                {item.amount != null && (
                  <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                    {formatMoney(item.amount)}
                  </p>
                )}
                {item.date && (
                  <p className="text-2xs text-slate-500 dark:text-slate-400">{formatDate(item.date)}</p>
                )}
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <InboxRowActions item={item} onBillAction={onBillAction} onSnooze={onSnooze} onDismiss={onDismiss} />
            <InboxRowControls item={item} onSnooze={onSnooze} onDismiss={onDismiss} />
          </div>
        </div>
      </SwipeActionRow>
    </li>
  );
}
