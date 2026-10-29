'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Account } from '@/lib/account.types';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { keys } from '@/lib/query/keys';
import { AccountType } from '@/lib/types';

import { loadAccountStatements, loadCardCycleSummary, loadStatementDetail } from '../actions';

export function useStatementsDialog(account: Account) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);

  const isCard = account.type === AccountType.CREDIT_CARD;

  const statementsQuery = useQuery({
    queryKey: keys.statements.byAccount(account.id),
    queryFn: () => unwrapAction(loadAccountStatements(account.id)),
    enabled: open,
  });

  const cardSummaryQuery = useQuery({
    queryKey: keys.accounts.cycleSummary(account.id),
    queryFn: () => unwrapAction(loadCardCycleSummary(account.id)),
    enabled: open && isCard,
  });

  const detailQuery = useQuery({
    queryKey: keys.statements.detail(selectedStatementId ?? ''),
    queryFn: () => unwrapAction(loadStatementDetail(selectedStatementId as string)),
    enabled: Boolean(selectedStatementId),
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedStatementId(null);
    }
  };

  const handleSelectStatement = (statementId: string) => {
    setSelectedStatementId(statementId);
  };

  /** Re-runs both the statements list and (for cards) the cycle summary — wired to the "Retry" affordance. */
  const loadStatements = () => {
    statementsQuery.refetch();
    if (isCard) {
      cardSummaryQuery.refetch();
    } else {
      qc.invalidateQueries({ queryKey: keys.accounts.cycleSummary(account.id) });
    }
  };

  const statements = statementsQuery.data ?? [];
  const lastIngestionDate =
    statements.length > 0
      ? statements.reduce((max, s) => {
          const d = new Date(s.createdAt).getTime();
          return d > max ? d : max;
        }, 0)
      : null;

  return {
    open,
    handleOpenChange,
    statements,
    isLoading: statementsQuery.isLoading,
    error: statementsQuery.error ? getErrorMessage(statementsQuery.error, "Couldn't load statements. Try again.") : null,
    selectedStatementId,
    setSelectedStatementId,
    selectedDetail: detailQuery.data ?? null,
    isLoadingDetail: detailQuery.isLoading,
    detailError: detailQuery.error ? getErrorMessage(detailQuery.error, "Couldn't load statement details. Try again.") : null,
    cardSummary: cardSummaryQuery.data ?? null,
    isLoadingCardSummary: cardSummaryQuery.isLoading,
    cardSummaryError: cardSummaryQuery.error ? getErrorMessage(cardSummaryQuery.error, "Couldn't load the card cycle summary. Try again.") : null,
    lastIngestionDate,
    loadStatements,
    handleSelectStatement,
  };
}
