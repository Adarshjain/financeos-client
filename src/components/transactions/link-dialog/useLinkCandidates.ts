'use client';

import * as React from 'react';

import { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { FilterClause } from '@/lib/reports.types';
import { LinkType, Transaction } from '@/lib/transaction.types';

interface UseLinkCandidatesProps {
  open: boolean;
  /** `null` when the active kind isn't a txn-to-txn link type — the fetch is skipped. */
  linkType: LinkType | null;
  selectedTransactions: Transaction[];
  anchorId: string;
  getAccount: (id: string) => Account | undefined;
}

export interface UseLinkCandidatesResult {
  candidateSearch: string;
  setCandidateSearch: (search: string) => void;
  loadingCandidates: boolean;
  filteredCandidates: Transaction[];
  getRuleHint: () => string;
  resetCandidateSearch: () => void;
}

/** Candidate search/filter for the txn-to-txn link body — split out of `useTransactionLink` to stay under the file-size limit. */
export function useLinkCandidates({
  open,
  linkType,
  selectedTransactions,
  anchorId,
  getAccount,
}: UseLinkCandidatesProps): UseLinkCandidatesResult {
  const [candidateSearch, setCandidateSearch] = React.useState('');
  const [candidateResults, setCandidateResults] = React.useState<Transaction[]>([]);
  const [loadingCandidates, setLoadingCandidates] = React.useState(false);
  const candidateRequestIdRef = React.useRef(0);

  const resetCandidateSearch = React.useCallback(() => {
    setCandidateSearch('');
    setCandidateResults([]);
  }, []);

  const anchorTx = selectedTransactions.find((t) => t.id === anchorId);

  const fetchCandidates = React.useCallback(
    async (query: string, type: LinkType, anchor?: Transaction) => {
      const requestId = ++candidateRequestIdRef.current;
      setLoadingCandidates(true);
      try {
        const filters: FilterClause[] = [];

        if (anchor) {
          const anchorDebit = anchor.amount < 0;
          if (type === 'TRANSFER' || type === 'CC_PAYMENT' || type === 'REFUND') {
            filters.push({ field: 'type', operator: 'is', value: 'CREDIT' });
          } else if (type === 'FEE' || type === 'EMI') {
            filters.push({ field: 'type', operator: 'is', value: 'DEBIT' });
          } else if (type === 'REVERSAL') {
            filters.push({
              field: 'type',
              operator: 'is',
              value: anchorDebit ? 'CREDIT' : 'DEBIT',
            });
          }
        }

        const { data } = await api.POST('/api/v1/transactions/search', {
          body: {
            filters,
            search: query.trim() || null,
          },
          params: { query: { page: 0, size: 50 } },
        });
        if (requestId !== candidateRequestIdRef.current) return;
        if (data) {
          setCandidateResults(data.content);
        }
      } catch {
        // Ignore background errors
      } finally {
        if (requestId === candidateRequestIdRef.current) {
          setLoadingCandidates(false);
        }
      }
    },
    []
  );

  React.useEffect(() => {
    if (!open || !linkType) return;
    const timer = setTimeout(() => {
      fetchCandidates(candidateSearch, linkType, anchorTx);
    }, 300);
    return () => clearTimeout(timer);
  }, [open, candidateSearch, linkType, anchorTx, fetchCandidates]);

  const filteredCandidates = React.useMemo(() => {
    const selectedIds = new Set(selectedTransactions.map((t) => t.id));
    const curAnchorTx = selectedTransactions.find((t) => t.id === anchorId);

    return candidateResults.filter((t) => {
      if (selectedIds.has(t.id)) return false;
      if (t.links && t.links.length > 0) return false;
      if (t.obligationRefs && t.obligationRefs.length > 0) return false;

      if (!curAnchorTx) return true;

      const isDebit = t.amount < 0;
      const isCredit = t.amount >= 0;
      const anchorDebit = curAnchorTx.amount < 0;

      switch (linkType) {
        case 'TRANSFER':
          return isCredit && t.accountId !== curAnchorTx.accountId;
        case 'CC_PAYMENT': {
          const acc = getAccount(t.accountId);
          return isCredit && acc?.type === 'credit_card';
        }
        case 'REVERSAL':
          return isDebit !== anchorDebit && t.accountId === curAnchorTx.accountId;
        case 'REFUND':
          return isCredit;
        case 'FEE':
        case 'EMI':
          return isDebit;
        default:
          return true;
      }
    });
  }, [candidateResults, selectedTransactions, anchorId, linkType, getAccount]);

  const getRuleHint = React.useCallback(() => {
    if (!anchorTx) return 'Select an anchor transaction above.';
    switch (linkType) {
      case 'TRANSFER':
        return 'TRANSFER requires a Credit (income/transfer in) transaction on a different account.';
      case 'CC_PAYMENT':
        return 'CC_PAYMENT requires a Credit transaction posted to a Credit Card account.';
      case 'REVERSAL':
        return 'REVERSAL requires an opposite-direction transaction on the same account.';
      case 'REFUND':
        return 'REFUND requires Credit (refund/income) transactions.';
      case 'FEE':
        return 'FEE requires Debit (fee/charge) transactions.';
      case 'EMI':
        return 'EMI requires Debit (installment) transactions.';
      default:
        return '';
    }
  }, [anchorTx, linkType]);

  return {
    candidateSearch,
    setCandidateSearch,
    loadingCandidates,
    filteredCandidates,
    getRuleHint,
    resetCandidateSearch,
  };
}
