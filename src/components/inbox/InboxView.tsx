'use client';

import { CheckCircle2, Info } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { InboxActionResponse, InboxItemResponse } from '@/lib/api/types';
import { useInbox } from '@/lib/query/hooks/useInbox';

import { headerCounts, INBOX_SECTIONS } from './inbox.helpers';
import { InboxBillDialogs, type PendingBillAction, toPendingBillAction } from './InboxBillDialogs';
import { inboxRowId } from './InboxItemRow';
import { InboxSection } from './InboxSection';
import { useInboxActions } from './useInboxActions';

interface InboxViewProps {
  /** ?item=<key> from a push notification: highlight and scroll to that row. */
  highlightKey?: string | null;
}

/** The Inbox: a grouped action list (Act now, Needs a look, Info), not a feed. */
export function InboxView({ highlightKey = null }: InboxViewProps) {
  const { data, isLoading, error } = useInbox();
  const { snooze, dismiss } = useInboxActions();
  const [pendingBill, setPendingBill] = React.useState<PendingBillAction | null>(null);
  const closeBill = React.useCallback(() => setPendingBill(null), []);

  const items = React.useMemo(() => data?.items ?? [], [data]);
  const deepLink = useDeepLink(highlightKey, data ? items : null);

  const onBillAction = (item: InboxItemResponse, action: InboxActionResponse) => {
    const pending = toPendingBillAction(item, action);
    if (pending) setPendingBill(pending);
  };

  const handlers = {
    onBillAction,
    onSnooze: (item: InboxItemResponse, until: string) => snooze(item.key, until),
    onDismiss: (item: InboxItemResponse) => dismiss(item.key),
  };

  const counts = headerCounts(data?.summary);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pb-20 pt-2.5 md:px-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Inbox</h1>
        {counts && (
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400" data-testid="inbox-counts">
            {counts}
          </p>
        )}
      </div>

      {deepLink.missing && (
        <p
          className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          data-testid="inbox-handled-note"
        >
          <Info className="h-4 w-4 shrink-0" />
          That item is already handled
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">
          Couldn&apos;t load the inbox: {getErrorMessage(error, 'request failed')}
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All clear"
          description="Nothing needs you right now. Bills, EMIs and anything to review will show up here."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/upcoming">Upcoming</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/transactions">Transactions</Link>
              </Button>
            </div>
          }
        />
      ) : (
        INBOX_SECTIONS.map(({ key, title }) => {
          const sectionItems = items.filter((i) => i.section === key);
          if (sectionItems.length === 0) return null;
          return (
            <InboxSection
              key={key}
              sectionKey={key}
              title={title}
              items={sectionItems}
              highlightKey={deepLink.found ? highlightKey : null}
              {...handlers}
            />
          );
        })
      )}

      <InboxBillDialogs pending={pendingBill} onClose={closeBill} />
    </div>
  );
}

/**
 * Resolve the ?item= deep link once, against the first loaded list: scroll to the row when it is
 * there, or flag it as already handled. Later refetches (after the user acts on the row) do not
 * flip it to "handled".
 */
function useDeepLink(highlightKey: string | null, items: InboxItemResponse[] | null) {
  const [state, setState] = React.useState<{ found: boolean; missing: boolean }>({ found: false, missing: false });
  const resolved = React.useRef(false);

  React.useEffect(() => {
    if (!highlightKey || !items || resolved.current) return;
    resolved.current = true;
    const found = items.some((i) => i.key === highlightKey);
    setState({ found, missing: !found });
  }, [highlightKey, items]);

  React.useEffect(() => {
    if (!state.found || !highlightKey) return;
    document.getElementById(inboxRowId(highlightKey))?.scrollIntoView({ block: 'center' });
  }, [state.found, highlightKey]);

  return state;
}
