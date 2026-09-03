'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { keys } from '@/lib/query/keys';
import { CardCycleSummary, StatementDetail, StatementSummary } from '@/lib/statement.types';
import { AccountType } from '@/lib/types';

export function useStatementsDialog(account: Account) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);

  const isCard = account.type === AccountType.CREDIT_CARD;

  const statementsQuery = useQuery({
    queryKey: keys.statements.byAccount(account.id),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/accounts/{accountId}/statements', {
        params: { path: { accountId: account.id } },
      });
      return (data ?? []) as StatementSummary[];
    },
    enabled: open,
  });

  const cardSummaryQuery = useQuery({
    queryKey: keys.accounts.cycleSummary(account.id),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/accounts/{id}/card-summary', {
        params: { path: { id: account.id } },
      });
      return (data ?? null) as CardCycleSummary | null;
    },
    enabled: open && isCard,
  });

  const detailQuery = useQuery({
    queryKey: keys.statements.detail(selectedStatementId ?? ''),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/statements/{statementId}', {
        params: { path: { statementId: selectedStatementId as string } },
      });
      return data as StatementDetail;
    },
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
    error: statementsQuery.error ? getErrorMessage(statementsQuery.error, 'Failed to load statements') : null,
    selectedStatementId,
    setSelectedStatementId,
    selectedDetail: detailQuery.data ?? null,
    isLoadingDetail: detailQuery.isLoading,
    detailError: detailQuery.error ? getErrorMessage(detailQuery.error, 'Failed to load statement details') : null,
    cardSummary: cardSummaryQuery.data ?? null,
    isLoadingCardSummary: cardSummaryQuery.isLoading,
    cardSummaryError: cardSummaryQuery.error ? getErrorMessage(cardSummaryQuery.error, 'Failed to fetch card cycle summary') : null,
    lastIngestionDate,
    loadStatements,
    handleSelectStatement,
  };
}
