'use client';

import { AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { InboxActionResponse, InboxItemResponse, InboxSummaryResponse } from '@/lib/api/types';
import { useInbox } from '@/lib/query/hooks/useInbox';
import { cn } from '@/lib/utils';

import { InboxBillDialogs, type PendingBillAction, toPendingBillAction } from './InboxBillDialogs';
import { InboxWidgetRow } from './InboxWidgetRow';

/** How many decisions the widget shows before pointing at the Inbox page. */
export const INBOX_WIDGET_ROW_LIMIT = 4;

/** Act-now rows first, then needs-a-look, up to the limit; info rows stay on the Inbox page. */
export function inboxWidgetRows(items: InboxItemResponse[], limit = INBOX_WIDGET_ROW_LIMIT): InboxItemResponse[] {
  const actNow = items.filter((i) => i.section === 'act_now');
  const needsLook = items.filter((i) => i.section === 'needs_look');
  return [...actNow, ...needsLook].slice(0, limit);
}

/**
 * The Inbox widget BODY (the host supplies the frame and title): counts for "Act now" and
 * "Needs a look", the most urgent few rows with their primary action inline, and a link to the
 * full Inbox. Fills its container and scrolls internally; bill actions open the same dialogs
 * as the Inbox page.
 */
export function InboxWidget({ className }: { className?: string }) {
  const { data, isLoading, error } = useInbox();
  const [pendingBill, setPendingBill] = React.useState<PendingBillAction | null>(null);
  const closeBill = React.useCallback(() => setPendingBill(null), []);

  const items = data?.items ?? [];
  const rows = inboxWidgetRows(items);
  const hasMore = items.length > rows.length;

  const onBillAction = (item: InboxItemResponse, action: InboxActionResponse) => {
    const pending = toPendingBillAction(item, action);
    if (pending) setPendingBill(pending);
  };

  let body: React.ReactNode;
  if (isLoading) {
    body = (
      <div className="space-y-2.5 px-3 pb-3 pt-1" data-testid="inbox-widget-loading">
        <Skeleton className="h-7 w-2/3 rounded-full" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-11/12 rounded-md" />
        <Skeleton className="h-4 w-4/5 rounded-md" />
      </div>
    );
  } else if (error) {
    body = (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center text-xs text-rose-600 dark:text-rose-400"
        role="alert"
      >
        <AlertCircle className="h-5 w-5 text-rose-500" />
        <p className="line-clamp-2">Couldn&apos;t load the inbox: {getErrorMessage(error, 'request failed')}</p>
      </div>
    );
  } else if (rows.length === 0) {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-4 py-6 text-center" data-testid="inbox-widget-clear">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        </span>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">All clear</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Nothing needs you right now</p>
      </div>
    );
  } else {
    body = (
      <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
        {rows.map((item) => (
          <InboxWidgetRow key={item.key} item={item} onBillAction={onBillAction} />
        ))}
      </ul>
    );
  }

  return (
    <div className={cn('flex min-h-0 flex-col', className)} data-testid="inbox-widget">
      {data && !error && <InboxCounts summary={data.summary} />}
      {body}
      {hasMore && !error && (
        <Link
          href="/inbox"
          className="flex shrink-0 items-center justify-center gap-1 border-t border-slate-100 py-2 text-xs font-medium text-emerald-700 hover:bg-slate-50 dark:border-slate-800 dark:text-emerald-400 dark:hover:bg-slate-800/50"
        >
          View all in Inbox
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
      <InboxBillDialogs pending={pendingBill} onClose={closeBill} />
    </div>
  );
}

const countPillClass =
  'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-2xs font-semibold transition-colors';
const calmPillClass =
  'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700';

/** "Act now N" (rose while anything is due) and "Needs a look N", each opening the Inbox. */
function InboxCounts({ summary }: { summary: InboxSummaryResponse }) {
  const urgent = summary.actNow > 0;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 px-3 pb-2" data-testid="inbox-widget-counts">
      <Link
        href="/inbox"
        className={cn(
          countPillClass,
          urgent
            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60'
            : calmPillClass,
        )}
      >
        Act now <span className="text-xs font-bold tabular-nums">{summary.actNow}</span>
      </Link>
      <Link href="/inbox" className={cn(countPillClass, calmPillClass)}>
        Needs a look <span className="text-xs font-bold tabular-nums">{summary.needsLook}</span>
      </Link>
    </div>
  );
}
