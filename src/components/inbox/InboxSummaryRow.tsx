'use client';

import { Badge } from '@/components/ui/badge';
import type { InboxItemResponse } from '@/lib/api/types';
import { cn } from '@/lib/utils';

import { severityStripeClass } from './inbox.helpers';
import { inboxRowId } from './InboxItemRow';
import { InboxRowActions, InboxRowControls, type InboxRowHandlers } from './InboxRowActions';

interface InboxSummaryRowProps extends InboxRowHandlers {
  item: InboxItemResponse;
  highlighted: boolean;
}

const HIGHLIGHT = 'bg-emerald-50/60 dark:bg-emerald-950/20 ring-1 ring-inset ring-emerald-500/40';

/** A count behind one link ("Transactions to review 42 · Review"); can be dismissed, never snoozed. */
export function InboxSummaryRow({ item, highlighted, onBillAction, onSnooze, onDismiss }: InboxSummaryRowProps) {
  return (
    <li id={inboxRowId(item.key)} data-inbox-key={item.key} data-testid="inbox-summary-row">
      <div className={cn('relative flex flex-wrap items-center gap-2 py-3 pl-5 pr-4', highlighted && HIGHLIGHT)}>
        <span
          aria-hidden="true"
          className={cn('absolute left-0 top-0 bottom-0 w-1', severityStripeClass(item.severity))}
        />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white break-words">{item.title}</p>
            {item.subtitle && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 break-words">{item.subtitle}</p>
            )}
          </div>
          {item.count != null && item.count > 0 && (
            <Badge variant="slate" size="sm" className="shrink-0 tabular-nums">
              {item.count}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <InboxRowActions item={item} limit={1} onBillAction={onBillAction} onSnooze={onSnooze} onDismiss={onDismiss} />
          <InboxRowControls item={item} onSnooze={onSnooze} onDismiss={onDismiss} />
        </div>
      </div>
    </li>
  );
}
