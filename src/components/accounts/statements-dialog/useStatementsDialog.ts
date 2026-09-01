'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getCardCycleSummary } from '@/actions/accounts';
import { getStatementDetail, listStatementsByAccount } from '@/actions/statements';
import { Account } from '@/lib/account.types';
import { CardCycleSummary, StatementDetail, StatementSummary } from '@/lib/statement.types';
import { AccountType } from '@/lib/types';

export function useStatementsDialog(account: Account) {
  const [open, setOpen] = useState(false);
  const [statements, setStatements] = useState<StatementSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<StatementDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [cardSummary, setCardSummary] = useState<CardCycleSummary | null>(null);
  const [isLoadingCardSummary, setIsLoadingCardSummary] = useState(false);
  const [cardSummaryError, setCardSummaryError] = useState<string | null>(null);

  /** Monotonic id so only the newest statement-detail response is applied. */
  const detailRequestIdRef = useRef(0);

  const loadStatements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCardSummaryError(null);

    const isCard = account.type === AccountType.CREDIT_CARD;
    if (isCard) setIsLoadingCardSummary(true);

    const [statementsRes, summaryRes] = await Promise.all([
      listStatementsByAccount(account.id),
      isCard ? getCardCycleSummary(account.id) : Promise.resolve(null),
    ]);

    if (statementsRes.success && statementsRes.data) {
      setStatements(statementsRes.data);
    } else if (!statementsRes.success) {
      setError(statementsRes.error.message || 'Failed to load statements');
    }
    setIsLoading(false);

    if (isCard && summaryRes) {
      if (summaryRes.success && summaryRes.data) {
        setCardSummary(summaryRes.data);
      } else {
        setCardSummary(null);
        if (!summaryRes.success) setCardSummaryError(summaryRes.error.message);
      }
      setIsLoadingCardSummary(false);
    }
  }, [account.id, account.type]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedStatementId(null);
      setSelectedDetail(null);
    }
  };

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) {
        loadStatements();
      }
    });

    return () => {
      isMounted = false;
    };
  }, [open, loadStatements]);

  const handleSelectStatement = async (statementId: string) => {
    setSelectedStatementId(statementId);
    setSelectedDetail(null);
    setIsLoadingDetail(true);
    setDetailError(null);

    const requestId = ++detailRequestIdRef.current;
    const res = await getStatementDetail(statementId);
    if (requestId !== detailRequestIdRef.current) return;

    if (res.success && res.data) {
      setSelectedDetail(res.data);
    } else if (!res.success) {
      setDetailError(res.error.message || 'Failed to load statement details');
    }
    setIsLoadingDetail(false);
  };

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
    isLoading,
    error,
    selectedStatementId,
    setSelectedStatementId,
    selectedDetail,
    isLoadingDetail,
    detailError,
    cardSummary,
    isLoadingCardSummary,
    cardSummaryError,
    lastIngestionDate,
    loadStatements,
    handleSelectStatement,
  };
}
