'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import type { CreateLoanPaymentRequest, InstallmentDto, LoanResponse } from '@/lib/loan.types';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import type { Transaction } from '@/lib/transaction.types';

interface UseLoanPaymentLinkProps {
  /** Undefined whenever the LOAN_PAYMENT link kind isn't the active/enabled one. */
  transaction: Transaction | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export interface UseLoanPaymentLinkResult {
  loans: LoanResponse[];
  loadingLoans: boolean;
  loanId: string;
  setLoanId: (id: string) => void;
  installments: InstallmentDto[];
  loadingSchedule: boolean;
  installmentSeq: number | undefined;
  setInstallmentSeq: (seq: number) => void;
  paymentDate: string;
  setPaymentDate: (date: string) => void;
  amount: string;
  setAmount: (amount: string) => void;
  submitting: boolean;
  canSubmit: boolean;
  handleSubmit: () => void;
}

function pickNearestInstallment(
  installments: InstallmentDto[],
  targetDate: string,
): InstallmentDto | undefined {
  if (installments.length === 0) return undefined;
  const target = new Date(targetDate).getTime();
  return installments.reduce((best, current) => {
    const bestDiff = Math.abs(new Date(best.dueDate).getTime() - target);
    const currentDiff = Math.abs(new Date(current.dueDate).getTime() - target);
    return currentDiff < bestDiff ? current : best;
  });
}

/**
 * Powers the LOAN_PAYMENT link kind: pick an active loan, pick one of its
 * unsettled installments, and settle it against the subject transaction.
 *
 * The schedule endpoint returns a grouping map that's normalised into a flat
 * list; that normaliser is duplicated here (rather than imported) from
 * `src/app/(protected)/loans/[id]/components/useLoanQueries.ts`, which lives
 * outside this feature's ownership.
 */
export function useLoanPaymentLink({
  transaction,
  open,
  onOpenChange,
  onSuccess,
}: UseLoanPaymentLinkProps): UseLoanPaymentLinkResult {
  const queryClient = useQueryClient();

  const [loanId, setLoanId] = React.useState('');
  const [installmentSeq, setInstallmentSeq] = React.useState<number | undefined>(undefined);
  const [paymentDate, setPaymentDate] = React.useState('');
  const [amount, setAmount] = React.useState('');

  const prevOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (open && !prevOpenRef.current && transaction) {
      setLoanId('');
      setInstallmentSeq(undefined);
      setPaymentDate(transaction.date);
      setAmount(Math.abs(transaction.amount).toString());
    }
    prevOpenRef.current = open;
  }, [open, transaction]);

  const loansQuery = useQuery({
    queryKey: keys.loans.list({ status: 'active', page: 0, size: 100 }),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/loans', {
        params: { query: { status: 'active', page: 0, size: 100 } },
      });
      return (data?.content ?? []) as LoanResponse[];
    },
    enabled: open,
  });
  const loans = loansQuery.data ?? [];

  const scheduleQuery = useQuery({
    queryKey: keys.loans.schedule(loanId),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/loans/{id}/schedule', {
        params: { path: { id: loanId } },
      });
      // The endpoint returns a map keyed by an internal grouping; in practice a
      // flat list. Object.values(...).flat() is correct either way.
      return Object.values((data ?? {}) as Record<string, InstallmentDto[]>).flat();
    },
    enabled: open && Boolean(loanId),
  });

  const installments = React.useMemo(
    () => (scheduleQuery.data ?? []).filter((i) => i.status !== 'settled'),
    [scheduleQuery.data],
  );

  const prevLoanIdRef = React.useRef('');
  React.useEffect(() => {
    if (loanId !== prevLoanIdRef.current) {
      prevLoanIdRef.current = loanId;
      setInstallmentSeq(undefined);
    }
  }, [loanId]);

  // Default to the unsettled installment whose due date is nearest the
  // transaction's date, once per loan selection.
  React.useEffect(() => {
    if (!loanId || installmentSeq !== undefined || installments.length === 0) return;
    const nearest = pickNearestInstallment(installments, transaction?.date ?? paymentDate);
    if (nearest) setInstallmentSeq(nearest.seq);
  }, [loanId, installments, installmentSeq, transaction, paymentDate]);

  const submitMutation = useMutation({
    mutationFn: () => {
      const body: CreateLoanPaymentRequest = {
        paymentDate,
        amount: Number(amount),
        installmentSeq,
        transactionId: transaction!.id,
      };
      return api
        .POST('/api/v1/loans/{id}/payments', { params: { path: { id: loanId } }, body })
        .then((r) => r.data!);
    },
    onSuccess: (data) => {
      toast.success(`Installment #${data.installmentSeq} settled`);
      queryClient.invalidateQueries({ queryKey: keys.loans.all });
      queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: unknown) => {
      toastError(err, 'Failed to settle installment');
    },
  });

  const canSubmit = Boolean(
    transaction && loanId && installmentSeq !== undefined && paymentDate && Number(amount) > 0,
  );

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error('Select a loan and installment, and check the amount');
      return;
    }
    submitMutation.mutate();
  };

  return {
    loans,
    loadingLoans: loansQuery.isLoading,
    loanId,
    setLoanId,
    installments,
    loadingSchedule: scheduleQuery.isLoading,
    installmentSeq,
    setInstallmentSeq,
    paymentDate,
    setPaymentDate,
    amount,
    setAmount,
    submitting: submitMutation.isPending,
    canSubmit,
    handleSubmit,
  };
}
