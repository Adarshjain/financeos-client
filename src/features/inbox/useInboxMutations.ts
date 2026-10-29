'use client';

import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { InboxItemResponse, InboxResponse, InboxSummaryResponse } from '@/lib/api/types';
import { formatDate } from '@/lib/format';
import { keys } from '@/lib/query/keys';

import { dismissEpfSuggestion, dismissInboxItem, linkEpfSuggestion, snoozeInboxItem, undoInboxState } from './inboxActions';
import { summarise } from './inboxModel';

/** How snooze, dismiss and undo tell the user what happened. The default is today's Legacy toasts. */
export interface InboxNotifier {
  snoozed: (until: string, undo: () => void) => void;
  dismissed: (undo: () => void) => void;
  restored: () => void;
  snoozeFailed: (error: unknown) => void;
  dismissFailed: (error: unknown) => void;
  undoFailed: (error: unknown) => void;
  /** An EPF suggestion was linked, or turned down with "Not this one"; either failing puts the row back. */
  epfLinked?: () => void;
  epfDismissed?: () => void;
  epfFailed?: (error: unknown) => void;
}

export const sonnerInboxNotifier: InboxNotifier = {
  snoozed: (until, undo) =>
    toast.success(`Snoozed until ${formatDate(until, 'list')}`, { action: { label: 'Undo', onClick: undo } }),
  dismissed: (undo) => toast.success('Dismissed', { action: { label: 'Undo', onClick: undo } }),
  restored: () => toast.success('Restored'),
  snoozeFailed: (e) => toast.error(getErrorMessage(e, "Couldn't snooze this item. Try again.")),
  dismissFailed: (e) => toast.error(getErrorMessage(e, "Couldn't dismiss this item. Try again.")),
  undoFailed: (e) => toast.error(getErrorMessage(e, "Couldn't undo. Try again.")),
  epfLinked: () => toast.success('Linked to the EPF withdrawal'),
  epfDismissed: () => toast.success('Dismissed'),
  epfFailed: (e) => toast.error(getErrorMessage(e, "Couldn't update this suggestion. Try again.")),
};

const INBOX_ACTION_KEY = ['inbox', 'action'] as const;

interface Snapshot {
  list?: InboxResponse;
  summary?: InboxSummaryResponse;
}

/** Drop the row from the cached list (and the badge counts) before the server answers. */
async function hideRow(qc: QueryClient, key: string): Promise<Snapshot> {
  await qc.cancelQueries({ queryKey: keys.inbox.all });
  const list = qc.getQueryData<InboxResponse>(keys.inbox.list());
  const summary = qc.getQueryData<InboxSummaryResponse>(keys.inbox.summary());
  if (list) {
    const items = list.items.filter((i) => i.key !== key);
    const next = summarise(items);
    qc.setQueryData<InboxResponse>(keys.inbox.list(), { ...list, items, summary: next });
    qc.setQueryData<InboxSummaryResponse>(keys.inbox.summary(), next);
  }
  return { list, summary };
}

function restore(qc: QueryClient, snapshot: Snapshot | undefined) {
  if (snapshot?.list) qc.setQueryData(keys.inbox.list(), snapshot.list);
  if (snapshot?.summary) qc.setQueryData(keys.inbox.summary(), snapshot.summary);
}

/*
 * Snooze, dismiss and undo on an inbox row. Snooze and dismiss remove the row optimistically and
 * offer "Undo" in the toast, which clears the row's state on the server. Keys contain ':';
 * the actions pass the raw key because openapi-fetch percent-encodes path params itself.
 */
export function useInboxMutations(notifier: InboxNotifier = sonnerInboxNotifier) {
  const qc = useQueryClient();
  // The list and the badge counts are query-backed (server-prefetched into the same keys), so a refetch is the refresh.
  // Only after the last overlapping action settles (the settling one still counts as mutating): an earlier refetch
  // could land while another action is in flight and bring back the row it has optimistically hidden.
  const settle = () => {
    if (qc.isMutating({ mutationKey: INBOX_ACTION_KEY }) > 1) return undefined;
    return qc.invalidateQueries({ queryKey: keys.inbox.all });
  };

  const undo = useMutation({
    mutationKey: INBOX_ACTION_KEY,
    mutationFn: (key: string) => unwrapAction(undoInboxState(key)),
    onSuccess: () => notifier.restored(),
    onError: (e) => notifier.undoFailed(e),
    onSettled: settle,
  });

  const undoFor = (key: string) => () => undo.mutate(key);

  const snooze = useMutation({
    mutationKey: INBOX_ACTION_KEY,
    mutationFn: ({ key, until }: { key: string; until: string }) => unwrapAction(snoozeInboxItem(key, until)),
    onMutate: ({ key }) => hideRow(qc, key),
    onSuccess: (_data, { key, until }) => notifier.snoozed(until, undoFor(key)),
    onError: (e, _vars, snapshot) => {
      restore(qc, snapshot);
      notifier.snoozeFailed(e);
    },
    onSettled: settle,
  });

  const dismiss = useMutation({
    mutationKey: INBOX_ACTION_KEY,
    mutationFn: (key: string) => unwrapAction(dismissInboxItem(key)),
    onMutate: (key) => hideRow(qc, key),
    onSuccess: (_data, key) => notifier.dismissed(undoFor(key)),
    onError: (e, _key, snapshot) => {
      restore(qc, snapshot);
      notifier.dismissFailed(e);
    },
    onSettled: settle,
  });

  const epfLink = useMutation({
    mutationKey: INBOX_ACTION_KEY,
    mutationFn: async (item: InboxItemResponse) => {
      const { epfEntryId, transactionId } = item.refs;
      if (!epfEntryId || !transactionId) throw new Error('This suggestion has no withdrawal or credit');
      await unwrapAction(linkEpfSuggestion(epfEntryId, transactionId));
    },
    onMutate: (item) => hideRow(qc, item.key),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.transactions.all });
      void qc.invalidateQueries({ queryKey: keys.epf.all });
      notifier.epfLinked?.();
    },
    onError: (e, _item, snapshot) => {
      restore(qc, snapshot);
      notifier.epfFailed?.(e);
    },
    onSettled: settle,
  });

  // "Not this one": the server stops suggesting this credit, then the row is dismissed like any other.
  const epfDismiss = useMutation({
    mutationKey: INBOX_ACTION_KEY,
    mutationFn: (item: InboxItemResponse) =>
      unwrapAction(dismissEpfSuggestion(item.key, item.refs.epfEntryId, item.refs.transactionId)),
    onMutate: (item) => hideRow(qc, item.key),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.epf.all });
      notifier.epfDismissed?.();
    },
    onError: (e, _item, snapshot) => {
      restore(qc, snapshot);
      notifier.epfFailed?.(e);
    },
    onSettled: settle,
  });

  return {
    epfLink: (item: InboxItemResponse) => epfLink.mutate(item),
    epfDismiss: (item: InboxItemResponse) => epfDismiss.mutate(item),
    snooze: (key: string, until: string) => snooze.mutate({ key, until }),
    dismiss: (key: string) => dismiss.mutate(key),
  };
}
