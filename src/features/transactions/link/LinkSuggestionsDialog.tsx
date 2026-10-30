'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { Divider } from '@/components/ds/Divider/Divider';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Radio } from '@/components/ds/Radio/Radio';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { TransactionRow } from '@/components/organisms/TransactionRow/TransactionRow';
import type { LinkSuggestionKind } from '@/features/inbox/inboxRowsModel';
import { LoadError } from '@/features/shell/LoadError';
import { deleteTransactionLink } from '@/features/transactions/detail/transactionDetailApi';
import { unwrapAction } from '@/lib/actionResult';
import type { Schemas } from '@/lib/api/types';
import { formatDate, formatMoney } from '@/lib/format';
import { invalidateMoneyQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

import { acceptLinkSuggestion, dismissLinkSuggestion, loadLinkSuggestions } from './linkActions';

type Suggestion = Schemas['LinkSuggestionResponse'];
type Summary = Schemas['TransactionSummary'];

const TITLES: Record<LinkSuggestionKind, string> = {
  TRANSFER: 'Possible transfers',
  CC_PAYMENT: 'Possible card payments',
  REFUND: 'Possible refunds',
};

export interface LinkSuggestionsDialogProps {
  /** The suggestion kind of the inbox row that opened this. */
  kind: LinkSuggestionKind;
  onClose: () => void;
}

const amountOf = (t: Summary) => formatMoney(Math.abs(t.amount), { decimals: 'exact', symbol: false });

/** Review the stored link suggestions of one kind: pick the match and Link it, or say Not a match. */
export function LinkSuggestionsDialog({ kind, onClose }: LinkSuggestionsDialogProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: keys.linkSuggestions.all,
    queryFn: () => unwrapAction(loadLinkSuggestions()),
  });
  // Blocks already handled leave at once; the choice per block defaults to its first candidate.
  const [gone, setGone] = React.useState<ReadonlySet<string>>(new Set());
  const [chosen, setChosen] = React.useState<Record<string, string>>({});
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const blocks = React.useMemo(
    () => (data ?? []).filter((s) => s.kind === kind && !gone.has(s.id)),
    [data, kind, gone],
  );

  // The last block going closes the dialog (not while the first load is still running).
  React.useEffect(() => {
    if (data && blocks.length === 0) onClose();
  }, [data, blocks.length, onClose]);

  const refresh = (transactionIds: string[]) => {
    void queryClient.invalidateQueries({ queryKey: keys.linkSuggestions.all });
    void queryClient.invalidateQueries({ queryKey: keys.inbox.all });
    void queryClient.invalidateQueries({ queryKey: keys.shell.counts() });
    void queryClient.invalidateQueries({ queryKey: keys.transactions.all });
    for (const id of transactionIds) void queryClient.invalidateQueries({ queryKey: keys.transactions.links(id) });
    void invalidateMoneyQueries(queryClient);
  };

  const remove = (id: string) => setGone((prev) => new Set(prev).add(id));

  const link = async (s: Suggestion) => {
    const candidateId = chosen[s.id] ?? s.candidates[0]?.id;
    if (!candidateId) return;
    setBusyId(s.id);
    try {
      const created = await unwrapAction(acceptLinkSuggestion(s.id, candidateId));
      remove(s.id);
      refresh([s.transaction.id, candidateId]);
      showToast('Linked', {
        action: {
          label: 'Undo',
          onSelect: () => {
            deleteTransactionLink(created.id)
              .then(() => refresh([s.transaction.id, candidateId]))
              .catch((e: unknown) => toastError(e, "Couldn't undo the link. Try again."));
          },
        },
      });
    } catch (e) {
      toastError(e, "Couldn't link the transactions. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  const dismiss = async (s: Suggestion) => {
    setBusyId(s.id);
    try {
      await unwrapAction(dismissLinkSuggestion(s.id));
      remove(s.id);
      refresh([]);
    } catch (e) {
      toastError(e, "Couldn't dismiss the suggestion. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content size="md" title={TITLES[kind]}>
        <Dialog.Body>
          {isError ? (
            <LoadError what="the suggestions" retry={() => void refetch()} />
          ) : isLoading ? (
            <div className="flex flex-col gap-space-8">
              <Skeleton width="60%" />
              <Skeleton width="80%" />
            </div>
          ) : (
            <div className="flex flex-col gap-space-16">
              {blocks.map((s, index) => {
                const selected = chosen[s.id] ?? s.candidates[0]?.id;
                const busy = busyId !== null;
                return (
                  <div key={s.id} data-testid="link-suggestion" className="flex flex-col gap-space-8">
                    {index > 0 ? <Divider /> : null}
                    <TransactionRow
                      compact
                      borderTop={false}
                      className="px-0"
                      description={s.transaction.description || 'Transaction'}
                      date={formatDate(s.transaction.date, 'list')}
                      account={s.transaction.accountName}
                      amount={s.transaction.type === 'CREDIT' ? `+${amountOf(s.transaction)}` : amountOf(s.transaction)}
                      isCredit={s.transaction.type === 'CREDIT'}
                    />
                    <div role="radiogroup" className="flex flex-col">
                      {s.candidates.map((c) => (
                        <ListRow
                          key={c.id}
                          role="radio"
                          aria-checked={selected === c.id}
                          aria-label={c.description || 'Transaction'}
                          className="px-0"
                          wrap
                          onClick={() => setChosen((prev) => ({ ...prev, [s.id]: c.id }))}
                          leading={<Radio checked={selected === c.id} tabIndex={-1} aria-hidden="true" />}
                          title={c.description || 'Transaction'}
                          subtitle={[formatDate(c.date, 'list'), c.accountName].join(' · ')}
                          trailing={
                            <Text variant="body-strong" as="span">
                              {c.type === 'CREDIT' ? '+' : ''}
                              {amountOf(c)}
                            </Text>
                          }
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-space-8">
                      <Button
                        size="sm"
                        loading={busyId === s.id}
                        disabled={busy || s.candidates.length === 0}
                        onClick={() => void link(s)}
                      >
                        Link
                      </Button>
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => void dismiss(s)}>
                        Not a match
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
