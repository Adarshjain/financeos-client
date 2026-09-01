'use client';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Account } from '@/lib/account.types';
import type { LoanResponse } from '@/lib/types';

import { LoanBasicFields } from './form/LoanBasicFields';
import { LoanFinancialFields } from './form/LoanFinancialFields';
import { useLoanForm } from './form/useLoanForm';

interface LoanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccounts: Account[];
  loanToEdit?: LoanResponse;
  hasEventsOrPayments?: boolean;
  onSuccess?: () => void;
}

export function LoanForm({
  open,
  onOpenChange,
  bankAccounts,
  loanToEdit,
  hasEventsOrPayments = false,
  onSuccess,
}: LoanFormProps) {
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
    onSuccess,
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
