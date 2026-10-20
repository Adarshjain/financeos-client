'use client';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import type { LoanResponse } from '@/lib/types';

import { LoanBasicFields } from './form/LoanBasicFields';
import { LoanFinancialFields } from './form/LoanFinancialFields';
import { useLoanForm } from './form/useLoanForm';

interface LoanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanToEdit?: LoanResponse;
  hasEventsOrPayments?: boolean;
}

export function LoanForm({
  open,
  onOpenChange,
  loanToEdit,
  hasEventsOrPayments = false,
}: LoanFormProps) {
  const { data: accounts } = useAccounts();
  const bankAccounts = (accounts ?? []).filter(
    (a) => a.type === 'bank_account'
  );

  const {
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
  } = useLoanForm({
    loanToEdit,
    onOpenChange,
  });

  const coreDisabled = isEdit && hasEventsOrPayments;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isEdit ? 'Edit Loan' : 'Create New Loan'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <form
            id="loan-form"
            onSubmit={handleSubmit}
            className="space-y-3 sm:space-y-4 pt-1"
          >
            {coreDisabled && (
              <div className="p-2.5 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-lg">
                Core terms (principal, rate, tenure, dates, EMI) are locked
                because events or payments exist.
              </div>
            )}

            <LoanBasicFields
              name={name}
              setName={setName}
              lender={lender}
              setLender={setLender}
              loanType={loanType}
              setLoanType={setLoanType}
              rateType={rateType}
              setRateType={setRateType}
              loanAccountNumber={loanAccountNumber}
              setLoanAccountNumber={setLoanAccountNumber}
              paymentAccountId={paymentAccountId}
              setPaymentAccountId={setPaymentAccountId}
              bankAccounts={bankAccounts}
              coreDisabled={coreDisabled}
            />

            <LoanFinancialFields
              principal={principal}
              setPrincipal={setPrincipal}
              annualRatePct={annualRatePct}
              setAnnualRatePct={setAnnualRatePct}
              tenureMonths={tenureMonths}
              setTenureMonths={setTenureMonths}
              startDate={startDate}
              setStartDate={setStartDate}
              firstEmiDate={firstEmiDate}
              setFirstEmiDate={setFirstEmiDate}
              emiAmount={emiAmount}
              setEmiAmount={setEmiAmount}
              notes={notes}
              setNotes={setNotes}
              coreDisabled={coreDisabled}
            />
          </form>
        </DialogBody>

        <DialogFooter
          primaryAction={{
            label: loading
              ? 'Saving...'
              : isEdit
                ? 'Save Changes'
                : 'Create Loan',
            type: 'submit',
            form: 'loan-form',
            disabled: loading,
          }}
          secondaryAction={{
            label: 'Cancel',
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
