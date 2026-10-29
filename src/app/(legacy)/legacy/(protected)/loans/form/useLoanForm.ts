'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import {
  buildCreateLoanRequest,
  buildUpdateLoanRequest,
  type LoanFormValues,
  loanProblems,
} from '@/features/loans/loanFormModel';
import { useCreateLoan } from '@/features/loans/useLoanMutations';
import { useUpdateLoan } from '@/features/loans/useLoanMutations';
import type { LoanResponse, LoanType, RateType } from '@/lib/types';

interface UseLoanFormProps {
  loanToEdit?: LoanResponse;
  onOpenChange: (open: boolean) => void;
}



export function useLoanForm({ loanToEdit, onOpenChange }: UseLoanFormProps) {
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

  const createMutation = useCreateLoan();

  const updateMutation = useUpdateLoan();

  const loading = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const values: LoanFormValues = {
      name,
      lender,
      loanType,
      rateType,
      loanAccountNumber,
      paymentAccountId,
      principal,
      annualRatePct,
      tenureMonths,
      startDate,
      firstEmiDate,
      emiAmount,
      notes,
    };
    const [problem] = loanProblems(values, isEdit);
    if (problem) {
      toast.error(problem.message);
      return;
    }

    if (isEdit && loanToEdit) {
      try {
        await updateMutation.mutateAsync({ id: loanToEdit.id, body: buildUpdateLoanRequest(values) });
        toast.success('Loan updated successfully');
        onOpenChange(false);
      } catch {
        // onError already surfaced the toast.
      }
      return;
    }

    try {
      await createMutation.mutateAsync(buildCreateLoanRequest(values));
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
