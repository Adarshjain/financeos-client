'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

import { useCounterpartyMutations } from './useCounterpartyMutations';

type LendingMatchSuggestion = Schemas['LendingMatchSuggestion'];
type LendingMatchSuggestionsResponse = Schemas['LendingMatchSuggestionsResponse'];

interface UseLendingMatchActionsProps {
  counterpartyId: string;
}

/**
 * Transaction-match suggestions + confirm actions for the counterparty ledger
 * page — mirrors the loan detail page's EMI matching banner. The server only
 * returns unlinked entries that have at least one candidate, and each
 * candidate transaction is assigned to at most one entry, so every suggestion
 * here is confirmable as-is.
 */
export function useLendingMatchActions({ counterpartyId }: UseLendingMatchActionsProps) {
  const { linkTransaction } = useCounterpartyMutations(counterpartyId);

  // Per-lendingId override of the default (first) candidate, set when the
  // user picks a different one from a multi-candidate dropdown.
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);

  const query = useQuery({
    queryKey: keys.lendings.matchSuggestions(counterpartyId),
    queryFn: async () =>
      (
        await api.GET('/api/v1/counterparties/{id}/match-suggestions', {
          params: { path: { id: counterpartyId } },
        })
      ).data! as LendingMatchSuggestionsResponse,
    enabled: false,
  });

  const suggestions = useMemo<LendingMatchSuggestion[]>(
    () => query.data?.suggestions ?? [],
    [query.data],
  );

  const selected = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of suggestions) {
      const chosen = overrides[s.lendingId] ?? s.candidates[0]?.id;
      if (chosen) map[s.lendingId] = chosen;
    }
    return map;
  }, [suggestions, overrides]);

  const select = (lendingId: string, transactionId: string) => {
    setOverrides((prev) => ({ ...prev, [lendingId]: transactionId }));
  };

  const confirmOne = async (lendingId: string) => {
    const transactionId = selected[lendingId];
    if (!transactionId) return;
    setConfirmingId(lendingId);
    try {
      await linkTransaction.mutateAsync({ id: lendingId, transactionId });
      toast.success('Transaction linked');
      await query.refetch();
    } catch {
      // onError already surfaced the toast.
    } finally {
      setConfirmingId(null);
    }
  };

  const confirmAll = async () => {
    const items = suggestions
      .map((s) => ({ lendingId: s.lendingId, transactionId: selected[s.lendingId] }))
      .filter((i): i is { lendingId: string; transactionId: string } => Boolean(i.transactionId));

    if (items.length === 0) return;

    setConfirmingAll(true);
    let succeeded = 0;
    for (const item of items) {
      try {
        await linkTransaction.mutateAsync({ id: item.lendingId, transactionId: item.transactionId });
        succeeded += 1;
      } catch {
        // onError already surfaced the toast for this item; keep confirming the rest.
      }
    }
    setConfirmingAll(false);

    toast.success(`Linked ${succeeded} of ${items.length}`);
    await query.refetch();
  };

  return {
    loading: query.isFetching,
    fetched: query.isFetched,
    suggestions,
    selected,
    select,
    confirmOne,
    confirmAll,
    confirmingId,
    confirmingAll,
    refetch: query.refetch,
  };
}
