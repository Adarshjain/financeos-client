'use client';

import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { InboxResponse, InboxSummaryResponse } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import { formatDate } from '@/lib/utils';

import { summarise } from './inbox.helpers';

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
 * openapi-fetch percent-encodes path params itself, so the raw key is passed (encoding here too
 * would double-encode it).
 */
export function useInboxActions() {
  const qc = useQueryClient();
  const settle = () => qc.invalidateQueries({ queryKey: keys.inbox.all });

  const undo = useMutation({
    mutationFn: (key: string) =>
      api.DELETE('/api/v1/inbox/{key}/state', { params: { path: { key } } }).then(() => undefined),
    onSuccess: () => toast.success('Restored'),
    onError: (e) => toast.error(getErrorMessage(e, 'Could not undo')),
    onSettled: settle,
  });

  const undoAction = (key: string) => ({ label: 'Undo', onClick: () => undo.mutate(key) });

  const snooze = useMutation({
    mutationFn: ({ key, until }: { key: string; until: string }) =>
      api
        .POST('/api/v1/inbox/{key}/snooze', { params: { path: { key } }, body: { until } })
        .then(() => undefined),
    onMutate: ({ key }) => hideRow(qc, key),
    onSuccess: (_data, { key, until }) =>
      toast.success(`Snoozed until ${formatDate(until)}`, { action: undoAction(key) }),
    onError: (e, _vars, snapshot) => {
      restore(qc, snapshot);
      toast.error(getErrorMessage(e, 'Could not snooze this item'));
    },
    onSettled: settle,
  });

  const dismiss = useMutation({
    mutationFn: (key: string) =>
      api.POST('/api/v1/inbox/{key}/dismiss', { params: { path: { key } } }).then(() => undefined),
    onMutate: (key) => hideRow(qc, key),
    onSuccess: (_data, key) => toast.success('Dismissed', { action: undoAction(key) }),
    onError: (e, _key, snapshot) => {
      restore(qc, snapshot);
      toast.error(getErrorMessage(e, 'Could not dismiss this item'));
    },
    onSettled: settle,
  });

  return {
    snooze: (key: string, until: string) => snooze.mutate({ key, until }),
    dismiss: (key: string) => dismiss.mutate(key),
  };
}
