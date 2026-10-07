'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import type { Transaction } from '@/lib/transaction.types';

import {
  type DividendRow,
  filterDividends,
  impliedTds,
  mergeDividends,
  pickBestDividend,
  UNRESOLVED_RECEIPTS,
} from './dividendLinkHelpers';

export type DividendLinkMode = 'existing' | 'new';
type DividendType = Schemas['CreateDividendRequest']['type'];

interface UseDividendLinkProps {
  /** Undefined whenever the DIVIDEND link kind isn't the active/enabled one. */
  transaction: Transaction | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

class LinkAfterCreateError extends Error {
  constructor(readonly original: unknown) {
    super('Dividend recorded, but linking failed');
  }
}

export function useDividendLink({
  transaction,
  open,
  onOpenChange,
  onSuccess,
}: UseDividendLinkProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = React.useState<DividendLinkMode>('existing');
  const [search, setSearch] = React.useState('');
  const [pickedId, setPickedId] = React.useState<string | null>(null);
  const [tdsChoice, setTdsChoice] = React.useState<boolean | null>(null);

  const [holding, setHolding] = React.useState('');
  const [type, setType] = React.useState<DividendType>('dividend');
  const [amount, setAmount] = React.useState('');
  const [payDate, setPayDate] = React.useState('');
  const [exDate, setExDate] = React.useState('');
  const [tds, setTds] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // Id of a dividend already created by a failed "record & link" attempt; retries only re-link.
  const createdIdRef = React.useRef<string | null>(null);
  const prevOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (open && !prevOpenRef.current && transaction) {
      createdIdRef.current = null;
      setMode('existing');
      setSearch('');
      setPickedId(null);
      setTdsChoice(null);
      setHolding('');
      setType('dividend');
      setAmount(Math.abs(transaction.amount).toString());
      setPayDate(transaction.date);
      setExDate('');
      setTds('');
      setNotes('');
    }
    prevOpenRef.current = open;
  }, [open, transaction]);

  const dividendsQuery = useQuery({
    queryKey: keys.investments.dividendsUnresolved(),
    queryFn: async () => {
      const pages = await Promise.all(
        UNRESOLVED_RECEIPTS.map((receipt) =>
          api.GET('/api/v1/investments/dividends', {
            params: { query: { receipt, page: 0, size: 50 } },
          }),
        ),
      );
      return mergeDividends(pages.map((p) => (p.data?.content ?? []) as DividendRow[]));
    },
    enabled: open,
  });
  const allDividends = React.useMemo(() => dividendsQuery.data ?? [], [dividendsQuery.data]);
  const dividends = React.useMemo(
    () => filterDividends(allDividends, search),
    [allDividends, search],
  );

  const txnAmount = transaction?.amount ?? 0;
  const bestId = React.useMemo(
    () =>
      transaction ? pickBestDividend(allDividends, txnAmount, transaction.date)?.id : undefined,
    [allDividends, transaction, txnAmount],
  );
  // A selection hidden by the search filter is dropped so it can't be submitted unseen.
  const candidateId = pickedId ?? bestId ?? '';
  const selectedId = dividends.some((d) => d.id === candidateId) ? candidateId : '';
  const selected = allDividends.find((d) => d.id === selectedId);
  const tdsGap = impliedTds(selected, txnAmount);
  const recordTds = tdsGap !== null && (tdsChoice ?? true);

  // A different dividend means a different gap: forget the previous TDS choice.
  React.useEffect(() => {
    setTdsChoice(null);
  }, [selectedId]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const transactionId = transaction!.id;
      if (mode === 'existing') {
        return api
          .PUT('/api/v1/investments/dividends/{id}/transaction', {
            params: { path: { id: selectedId } },
            body: { transactionId, updateTds: recordTds },
          })
          .then((r) => r.data);
      }
      const [brokerAccountId, instrumentId] = holding.split('|');
      if (!createdIdRef.current) {
        const created = await api
          .POST('/api/v1/investments/dividends', {
            body: {
              brokerAccountId,
              instrumentId,
              type,
              amount: parseFloat(amount),
              tds: tds ? parseFloat(tds) : undefined,
              exDate: exDate || undefined,
              payDate,
              notes: notes.trim() || undefined,
            },
          })
          .then((r) => r.data!);
        createdIdRef.current = created.id;
      }
      try {
        return await api
          .PUT('/api/v1/investments/dividends/{id}/transaction', {
            params: { path: { id: createdIdRef.current } },
            body: { transactionId, updateTds: false },
          })
          .then((r) => r.data);
      } catch (err) {
        throw new LinkAfterCreateError(err);
      }
    },
    onSuccess: () => {
      toast.success(mode === 'existing' ? 'Dividend linked' : 'Dividend recorded and linked');
      queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      queryClient.invalidateQueries({ queryKey: keys.investments.all });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: unknown) => {
      if (err instanceof LinkAfterCreateError) {
        // The dividend exists now; keep the dialog open so a retry only re-links.
        queryClient.invalidateQueries({ queryKey: keys.investments.all });
        toastError(err, 'Dividend recorded, but linking failed');
        return;
      }
      toastError(err, 'Failed to link dividend');
    },
  });

  const numAmount = parseFloat(amount);
  const canSubmit =
    Boolean(transaction) &&
    (mode === 'existing'
      ? Boolean(selected)
      : Boolean(holding) && numAmount > 0 && Boolean(payDate));

  const handleSubmit = () => {
    if (mode === 'new' && !holding) {
      toast.error('Please select a held instrument.');
      return;
    }
    if (mode === 'new' && (isNaN(numAmount) || numAmount <= 0)) {
      toast.error('Please enter a valid amount.');
      return;
    }
    if (!canSubmit) {
      toast.error(mode === 'existing' ? 'Select a dividend to link' : 'Check the dividend details');
      return;
    }
    submitMutation.mutate();
  };

  return {
    mode,
    setMode,
    search,
    setSearch,
    dividends,
    loadingDividends: dividendsQuery.isLoading,
    selectedId,
    setSelectedId: setPickedId,
    tdsGap,
    recordTds,
    setRecordTds: setTdsChoice as (v: boolean) => void,
    holding,
    setHolding,
    type,
    setType,
    amount,
    setAmount,
    payDate,
    setPayDate,
    exDate,
    setExDate,
    tds,
    setTds,
    notes,
    setNotes,
    submitting: submitMutation.isPending,
    canSubmit,
    handleSubmit,
  };
}

export type UseDividendLinkResult = ReturnType<typeof useDividendLink>;
