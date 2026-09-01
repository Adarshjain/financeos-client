'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { createTransactionLink } from '@/actions/transaction-links';
import { searchTransactions } from '@/actions/transactions';
import { Account } from '@/lib/account.types';
import { FilterClause } from '@/lib/reports.types';
import {
  CreateTransactionLinkRequest,
  LinkType,
  MemberRef,
  Transaction,
} from '@/lib/transaction.types';

interface UseTransactionLinkProps {
  initialTransaction?: Transaction;
  initialSelectedTransactions?: Transaction[];
  accounts: Account[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function useTransactionLink({
  initialTransaction,
  initialSelectedTransactions = [],
  accounts,
  open,
  onOpenChange,
  onSuccess,
}: UseTransactionLinkProps) {
  const [linkType, setLinkType] = React.useState<LinkType>('TRANSFER');
  const [note, setNote] = React.useState('');
  const [alignRefundCategories, setAlignRefundCategories] = React.useState(true);
  const [selectedTransactions, setSelectedTransactions] = React.useState<Transaction[]>([]);
  const [anchorId, setAnchorId] = React.useState<string>('');
  const [candidateSearch, setCandidateSearch] = React.useState('');
  const [candidateResults, setCandidateResults] = React.useState<Transaction[]>([]);
  const [loadingCandidates, setLoadingCandidates] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const prevOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (open && !prevOpenRef.current) {
      let initial: Transaction[] = [];
      if (initialTransaction) {
        initial = [initialTransaction];
      } else if (initialSelectedTransactions.length > 0) {
        initial = [...initialSelectedTransactions];
      }
      setSelectedTransactions(initial);

      const defaultAnchor = initial.find((t) => t.amount < 0) || initial[0];
      if (defaultAnchor) {
        setAnchorId(defaultAnchor.id);
      } else {
        setAnchorId('');
      }

      setNote('');
      setAlignRefundCategories(true);
      setCandidateSearch('');
      setCandidateResults([]);
    }
    prevOpenRef.current = open;
  }, [open, initialTransaction, initialSelectedTransactions]);

  const getAccount = React.useCallback(
    (accountId: string) => accounts.find((a) => a.id === accountId),
    [accounts]
  );

  const anchorTx = selectedTransactions.find((t) => t.id === anchorId);
  const candidateRequestIdRef = React.useRef(0);

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

        const res = await searchTransactions(
          {
            filters,
            search: query.trim() || null,
          },
          0,
          50
        );
        if (requestId !== candidateRequestIdRef.current) return;
        if (res.success) {
          setCandidateResults(res.data.content);
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
    if (!open) return;
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

  const toggleSelectTransaction = (t: Transaction) => {
    if (selectedTransactions.some((s) => s.id === t.id)) {
      const next = selectedTransactions.filter((s) => s.id !== t.id);
      setSelectedTransactions(next);
      if (anchorId === t.id) {
        const nextAnchor = next.find((item) => item.amount < 0) || next[0];
        setAnchorId(nextAnchor ? nextAnchor.id : '');
      }
    } else {
      const next = [...selectedTransactions, t];
      setSelectedTransactions(next);
      if (!anchorId) {
        setAnchorId(t.id);
      }
    }
  };

  const handleSubmit = async () => {
    if (selectedTransactions.length < 2) {
      toast.error('Select at least 2 transactions to link');
      return;
    }
    if (!anchorId) {
      toast.error('Select an anchor transaction');
      return;
    }

    setSubmitting(true);
    try {
      const members: MemberRef[] = selectedTransactions.map((t) => ({
        transactionId: t.id,
        isAnchor: t.id === anchorId,
      }));

      const payload: CreateTransactionLinkRequest = {
        type: linkType,
        members,
      };
      if (note.trim()) {
        payload.note = note.trim();
      }
      if (linkType === 'REFUND') {
        payload.alignRefundCategories = alignRefundCategories;
      }

      const res = await createTransactionLink(payload);

      if (res.success) {
        toast.success('Transactions linked successfully');
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.error.message || 'Failed to link transactions');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const getRuleHint = () => {
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
  };

  return {
    linkType,
    setLinkType,
    note,
    setNote,
    alignRefundCategories,
    setAlignRefundCategories,
    selectedTransactions,
    anchorId,
    setAnchorId,
    candidateSearch,
    setCandidateSearch,
    loadingCandidates,
    filteredCandidates,
    submitting,
    getAccount,
    toggleSelectTransaction,
    handleSubmit,
    getRuleHint,
  };
}
