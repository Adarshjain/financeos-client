'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { createLoanAction, updateLoanAction } from '@/actions/loans';
import type { LoanResponse, LoanType, RateType } from '@/lib/types';

interface UseLoanFormProps {
  loanToEdit?: LoanResponse;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function useLoanForm({
  loanToEdit,
  onOpenChange,
  onSuccess,
}: UseLoanFormProps) {
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
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    try {
      if (isEdit && loanToEdit) {
        const res = await updateLoanAction(loanToEdit.id, {
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
        });

        if (res.success) {
          toast.success('Loan updated successfully');
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error.message);
        }
      } else {
        if (!principal || Number(principal) <= 0) {
          toast.error('Principal must be greater than zero');
          setLoading(false);
          return;
        }
        if (!annualRatePct || Number(annualRatePct) <= 0) {
          toast.error('Annual rate % must be greater than zero');
          setLoading(false);
          return;
        }
        if (!tenureMonths || Number(tenureMonths) < 1) {
          toast.error('Tenure must be at least 1 month');
          setLoading(false);
          return;
        }

        const res = await createLoanAction({
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

        if (res.success) {
          toast.success('Loan created successfully');
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error.message);
        }
      }
    } finally {
      setLoading(false);
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
