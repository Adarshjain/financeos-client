'use client';

import React from 'react';

import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';

import { loadLoanFormDialog } from './lazyDialogs';

/** The frame of `/loans`, a sub-page of Accounts (back arrow to /accounts): the top bar, whose + adds a loan in place, then the page. */
export function LoansShell({ children }: { children: React.ReactNode }) {
  const [addingLoan, setAddingLoan] = React.useState(false);
  const { Component: LoanFormDialog, run: runLoan, loading: loanLoading } = useLazyDialog(loadLoanFormDialog);

  return (
    <>
      <ShellPage
        crumb={subCrumb('accounts', 'Loans')}
        title="Loans"
        addLabel="Add loan"
        onAdd={() => void runLoan(() => setAddingLoan(true))}
        addLoading={loanLoading}
      >
        {children}
      </ShellPage>
      {addingLoan && LoanFormDialog ? <LoanFormDialog onClose={() => setAddingLoan(false)} /> : null}
    </>
  );
}
