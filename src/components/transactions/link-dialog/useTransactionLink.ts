'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { toast } from 'sonner';

import { Account } from '@/lib/account.types';
import { api, ApiError } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import {
  CreateTransactionLinkRequest,
  isRecordKind,
  LinkKind,
  LinkType,
  MemberRef,
  Transaction,
} from '@/lib/transaction.types';

import { useLinkCandidates } from './useLinkCandidates';

interface UseTransactionLinkProps {
  initialTransaction?: Transaction;
  initialSelectedTransactions?: Transaction[];
  accounts: Account[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export interface UseTransactionLinkResult {
  kind: LinkKind;
  setKind: (kind: LinkKind) => void;
  /** `null` when `kind` is a record kind (LENDING / LOAN_PAYMENT). */
  linkType: LinkType | null;
  disabledKinds: Partial<Record<LinkKind, string>>;
  /** The single transaction a LENDING/LOAN_PAYMENT kind would act on, if any. */
  subjectTransaction?: Transaction;
  note: string;
  setNote: (note: string) => void;
  alignRefundCategories: boolean;
  setAlignRefundCategories: (align: boolean) => void;
  selectedTransactions: Transaction[];
  anchorId: string;
  setAnchorId: (id: string) => void;
  candidateSearch: string;
  setCandidateSearch: (search: string) => void;
  loadingCandidates: boolean;
  filteredCandidates: Transaction[];
  submitting: boolean;
  getAccount: (id: string) => Account | undefined;
  toggleSelectTransaction: (t: Transaction) => void;
  handleSubmit: () => void;
  getRuleHint: () => string;
}

export function useTransactionLink({
  initialTransaction,
  initialSelectedTransactions = [],
  accounts,
  open,
  onOpenChange,
  onSuccess,
}: UseTransactionLinkProps): UseTransactionLinkResult {
  const [kind, setKind] = React.useState<LinkKind>('TRANSFER');
  const [note, setNote] = React.useState('');
  const [alignRefundCategories, setAlignRefundCategories] = React.useState(true);
  const [selectedTransactions, setSelectedTransactions] = React.useState<Transaction[]>([]);
  const [anchorId, setAnchorId] = React.useState<string>('');

  const linkType = isRecordKind(kind) ? null : kind;

  const subjectTransaction =
    initialTransaction ??
    (initialSelectedTransactions.length === 1 ? initialSelectedTransactions[0] : undefined);

  const disabledKinds = React.useMemo<Partial<Record<LinkKind, string>>>(() => {
    const isBulk = !initialTransaction && initialSelectedTransactions.length > 1;
    if (isBulk) {
      const reason = 'Select a single transaction to record a lending or loan payment';
      return { LENDING: reason, LOAN_PAYMENT: reason };
    }
    if (!subjectTransaction) return {};

    const result: Partial<Record<LinkKind, string>> = {};
    const refs = subjectTransaction.obligationRefs ?? [];

    if (refs.some((r) => r.kind !== 'LENDING')) {
      result.LENDING = 'Already linked to a loan record';
    }
    if (refs.length > 0) {
      result.LOAN_PAYMENT = 'Already linked to a ledger/loan record';
    } else if (subjectTransaction.amount >= 0) {
      result.LOAN_PAYMENT = 'Loan payments must be money-out (debit) transactions';
    }
    return result;
  }, [initialTransaction, initialSelectedTransactions, subjectTransaction]);

  const getAccount = React.useCallback(
    (accountId: string) => accounts.find((a) => a.id === accountId),
    [accounts]
  );

  const {
    candidateSearch,
    setCandidateSearch,
    loadingCandidates,
    filteredCandidates,
    getRuleHint,
    resetCandidateSearch,
  } = useLinkCandidates({ open, linkType, selectedTransactions, anchorId, getAccount });

  const queryClient = useQueryClient();
  const createLinkMutation = useMutation({
    mutationFn: (body: CreateTransactionLinkRequest) =>
      api
        .POST('/api/v1/transaction-links', { body: body as Schemas['CreateTransactionLinkRequest'] })
        .then((r) => r.data!),
    onSuccess: () => {
      toast.success('Transactions linked successfully');
      queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.response.message : 'An unexpected error occurred');
    },
  });
  const submitting = createLinkMutation.isPending;

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

      setKind('TRANSFER');
      setNote('');
      setAlignRefundCategories(true);
      resetCandidateSearch();
    }
    prevOpenRef.current = open;
  }, [open, initialTransaction, initialSelectedTransactions, resetCandidateSearch]);

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

  const handleSubmit = () => {
    if (!linkType) return;
    if (selectedTransactions.length < 2) {
      toast.error('Select at least 2 transactions to link');
      return;
    }
    if (!anchorId) {
      toast.error('Select an anchor transaction');
      return;
    }

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

    createLinkMutation.mutate(payload);
  };

  return {
    kind,
    setKind,
    linkType,
    disabledKinds,
    subjectTransaction,
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
