'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { SectionHeader } from '@/components/ds/SectionHeader/SectionHeader';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { formatDate, formatMoney } from '@/lib/format';
import { invalidateMoneyQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';
import { absAmount } from '@/lib/transactionAmount';
import { useAppRouter } from '@/lib/useAppRouter';

import { acceptLinkSuggestion, dismissLinkSuggestion } from '../link/linkActions';
import { acceptedWord,acceptLabel, candidateIdFor, dismissLabel, isActionable } from './suggestionModel';

/** The server's "Looks like …" proposal for a transaction: each candidate with its own Link/Settle, and one Not this. */
export function TransactionSuggestionSection({ transaction: t }: { transaction: Transaction }) {
  const router = useAppRouter();
  const queryClient = useQueryClient();
  const suggestion = t.suggestion;
  const [refreshing, startTransition] = React.useTransition();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: keys.transactions.all });
    void queryClient.invalidateQueries({ queryKey: keys.inbox.all });
    void invalidateMoneyQueries(queryClient);
    // Held in a transition so Link / Not this keep spinning until the refreshed page is what shows.
    startTransition(() => router.refresh());
  };

  const accept = useMutation({
    mutationFn: (candidateId: string) => unwrapAction(acceptLinkSuggestion(suggestion!.id, candidateId)),
    onSuccess: () => {
      showToast(acceptedWord(suggestion!.kind));
      refresh();
    },
    onError: (e) => showToast(getErrorMessage(e, "Couldn't link the transactions. Try again."), { tone: 'danger' }),
  });
  const dismiss = useMutation({
    mutationFn: () => unwrapAction(dismissLinkSuggestion(suggestion!.id)),
    onSuccess: () => {
      showToast('Dismissed');
      refresh();
    },
    onError: (e) => showToast(getErrorMessage(e, "Couldn't dismiss the suggestion. Try again."), { tone: 'danger' }),
  });

  if (!suggestion || !isActionable(suggestion.kind)) return null;
  const busy = accept.isPending || dismiss.isPending || refreshing;

  return (
    <div>
      <SectionHeader variant="band">Suggested link</SectionHeader>
      <div className="px-space-16 desk:px-space-20 py-space-8">
        <Text variant="body" tone="ink-2">
          {suggestion.label}
        </Text>
      </div>
      {suggestion.candidates.map((c, i) => {
        const candidateId = candidateIdFor(suggestion.kind, t, c);
        const account = c.accountName ? ` · ${c.accountName}` : '';
        return (
          <ListRow
            key={c.transactionId ?? c.lendingId ?? i}
            wrap
            title={c.description || '—'}
            subtitle={`${formatDate(c.date, 'list')}${account} · ${formatMoney(absAmount(c.amount), { decimals: 'exact' })}`}
            trailing={
              candidateId ? (
                <Button size="sm" loading={(accept.isPending || (refreshing && accept.isSuccess)) && accept.variables === candidateId} disabled={busy} onClick={() => accept.mutate(candidateId)}>
                  {acceptLabel(suggestion.kind)}
                </Button>
              ) : null
            }
          />
        );
      })}
      <div className="px-space-16 desk:px-space-20 py-space-8">
        <Button size="sm" variant="secondary" loading={dismiss.isPending || (refreshing && dismiss.isSuccess)} disabled={busy} onClick={() => dismiss.mutate()}>
          {dismissLabel(suggestion.kind)}
        </Button>
      </div>
    </div>
  );
}
