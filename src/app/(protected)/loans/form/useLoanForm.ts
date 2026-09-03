'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type {
  CreateLoanRequest,
  LoanResponse,
  LoanType,
  RateType,
  UpdateLoanRequest,
} from '@/lib/types';

interface UseLoanFormProps {
  loanToEdit?: LoanResponse;
  onOpenChange: (open: boolean) => void;
}

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.response.message : fallback;
}

export function useLoanForm({ loanToEdit, onOpenChange }: UseLoanFormProps) {
  const qc = useQueryClient();
  const isEdit = Boolean(loanToEdit);

  const [name, setName] = useState(loanToEdit?.name ?? '');
  const [lender, setLender] = useState(loanToEdit?.lender ?? '');
  const [loanType, setLoanType] = useState<LoanType>(
    loanToEdit?.loanType ?? 'home'
  );
  const [rateType, setRateType] = useState<RateType>(
    loanToEdit?.rateType ?? 'fixed'
  );
  const [loanAccountNumber, setLoanAccountNumber] = useState(
    loanToEdit?.loanAccountNumber ?? ''
  );
  const [paymentAccountId, setPaymentAccountId] = useState(
    loanToEdit?.paymentAccountId ?? ''
  );
  const [principal, setPrincipal] = useState(
    loanToEdit?.principal ? String(loanToEdit.principal) : ''
  );
  const [annualRatePct, setAnnualRatePct] = useState(
    loanToEdit?.annualRatePct ? String(loanToEdit.annualRatePct) : ''
  );
  const [tenureMonths, setTenureMonths] = useState(
    loanToEdit?.tenureMonths ? String(loanToEdit.tenureMonths) : ''
  );
  const [startDate, setStartDate] = useState(
    loanToEdit?.startDate ?? new Date().toISOString().split('T')[0]
  );
  const [firstEmiDate, setFirstEmiDate] = useState(
    loanToEdit?.firstEmiDate ?? new Date().toISOString().split('T')[0]
  );
  const [emiAmount, setEmiAmount] = useState(
    loanToEdit?.emiAmount ? String(loanToEdit.emiAmount) : ''
  );
  const [notes, setNotes] = useState(loanToEdit?.notes ?? '');

  const createMutation = useMutation({
    mutationFn: (body: CreateLoanRequest) =>
      api.POST('/api/v1/loans', { body }).then((r) => r.data! as LoanResponse),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.loans.all }),
    onError: (e) => toast.error(errorMessage(e, 'Failed to create loan')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLoanRequest }) =>
      api
        .PUT('/api/v1/loans/{id}', { params: { path: { id } }, body })
        .then((r) => r.data! as LoanResponse),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.loans.all }),
    onError: (e) => toast.error(errorMessage(e, 'Failed to update loan')),
  });

  const loading = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Loan name is required');
      return;
    }
    if (!lender.trim()) {
      toast.error('Lender is required');
      return;
    }

    if (isEdit && loanToEdit) {
      try {
        await updateMutation.mutateAsync({
          id: loanToEdit.id,
          body: {
            name: name.trim(),
            lender: lender.trim(),
            loanType,
            rateType,
            loanAccountNumber: loanAccountNumber.trim() || undefined,
            paymentAccountId: paymentAccountId || undefined,
            principal: principal ? Number(principal) : undefined,
            annualRatePct: annualRatePct ? Number(annualRatePct) : undefined,
            tenureMonths: tenureMonths ? Number(tenureMonths) : undefined,
            startDate,
            firstEmiDate,
            emiAmount: emiAmount ? Number(emiAmount) : undefined,
            notes: notes.trim() || undefined,
          },
        });
        toast.success('Loan updated successfully');
        onOpenChange(false);
      } catch {
        // onError already surfaced the toast.
      }
      return;
    }

    if (!principal || Number(principal) <= 0) {
      toast.error('Principal must be greater than zero');
      return;
    }
    if (!annualRatePct || Number(annualRatePct) <= 0) {
      toast.error('Annual rate % must be greater than zero');
      return;
    }
    if (!tenureMonths || Number(tenureMonths) < 1) {
      toast.error('Tenure must be at least 1 month');
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        lender: lender.trim(),
        loanType,
        rateType,
        loanAccountNumber: loanAccountNumber.trim() || undefined,
        paymentAccountId: paymentAccountId || undefined,
        principal: Number(principal),
        annualRatePct: Number(annualRatePct),
        tenureMonths: Number(tenureMonths),
        startDate,
        firstEmiDate,
        emiAmount: emiAmount ? Number(emiAmount) : undefined,
        notes: notes.trim() || undefined,
      });
      toast.success('Loan created successfully');
      onOpenChange(false);
    } catch {
      // onError already surfaced the toast.
    }
  };

  return {
    isEdit,
    name,
    setName,
    lender,
    setLender,
    loanType,
    setLoanType,
    rateType,
    setRateType,
    loanAccountNumber,
    setLoanAccountNumber,
    paymentAccountId,
    setPaymentAccountId,
    principal,
    setPrincipal,
    annualRatePct,
    setAnnualRatePct,
    tenureMonths,
    setTenureMonths,
    startDate,
    setStartDate,
    firstEmiDate,
    setFirstEmiDate,
    emiAmount,
    setEmiAmount,
    notes,
    setNotes,
    loading,
    handleSubmit,
  };
}
