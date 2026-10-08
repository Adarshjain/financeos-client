'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { InboxActionResponse, InboxItemResponse } from '@/lib/api/types';
import { cn, formatMoney } from '@/lib/utils';

import { actionHref, isBillAction, primaryActions, severityStripeClass } from './inbox.helpers';

interface InboxWidgetRowProps {
  item: InboxItemResponse;
  onBillAction: (item: InboxItemResponse, action: InboxActionResponse) => void;
}

/** The row's own place on the Inbox page (the page scrolls to and rings `?item=`). */
export function inboxItemHref(key: string): string {
  return `/inbox?item=${encodeURIComponent(key)}`;
}

/**
 * One inbox decision on one line, for the dashboard widget: severity dot, title (opens the row
 * on the Inbox page), amount or count, and the row's single primary action. Snooze and dismiss
 * stay on the Inbox page.
 */
export function InboxWidgetRow({ item, onBillAction }: InboxWidgetRowProps) {
  const action = primaryActions(item)[0];
  const title = item.subtitle ? `${item.title} · ${item.subtitle}` : item.title;
  return (
    <li className="flex items-center gap-2 px-3 py-1.5" data-testid="inbox-widget-row">
      <span
        aria-hidden="true"
        className={cn('h-2 w-2 shrink-0 rounded-full', severityStripeClass(item.severity))}
      />
      <Link
        href={inboxItemHref(item.key)}
        className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800 hover:text-emerald-700 dark:text-slate-200 dark:hover:text-emerald-400"
        title={title}
      >
        {item.title}
      </Link>
      {item.amount != null ? (
        <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
          {formatMoney(item.amount)}
        </span>
      ) : item.count != null && item.count > 0 ? (
        <Badge variant="slate" size="sm" className="shrink-0 tabular-nums">
          {item.count}
        </Badge>
      ) : null}
      {action && <RowAction item={item} action={action} onBillAction={onBillAction} />}
    </li>
  );
}

function RowAction({ item, action, onBillAction }: InboxWidgetRowProps & { action: InboxActionResponse }) {
  if (isBillAction(action.type)) {
    return (
      <Button
        variant="outline"
        size="micro"
        className="shrink-0"
        onClick={() => onBillAction(item, action)}
        disabled={!action.payload?.statementId && !item.refs.statementId}
      >
        {action.label}
      </Button>
    );
  }
  const href = actionHref(action, item);
  if (!href) return null;
  return (
    <Button asChild variant="outline" size="micro" className="shrink-0">
      <Link href={href}>{action.label}</Link>
    </Button>
  );
}
