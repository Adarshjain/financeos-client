'use client';

import type { Account } from '@/lib/account.types';

import type { UseRecordLendingResult } from '../record-lending/useRecordLending';
import { CandidateSearchList } from './CandidateSearchList';
import { LendingLinkBody } from './LendingLinkBody';
import { LoanPaymentLinkBody } from './LoanPaymentLinkBody';
import { SelectedMembersList } from './SelectedMembersList';
import type { UseLoanPaymentLinkResult } from './useLoanPaymentLink';
import type { UseTransactionLinkResult } from './useTransactionLink';

interface LinkDialogBodyProps {
  linkState: UseTransactionLinkResult;
  lending: UseRecordLendingResult;
  loanPayment: UseLoanPaymentLinkResult;
  accounts: Account[];
}

/** Routes the dialog body to the txn-link UI or one of the two record-kind bodies. */
export function LinkDialogBody({ linkState, lending, loanPayment, accounts }: LinkDialogBodyProps) {
  const { kind, subjectTransaction } = linkState;

  if (kind === 'LENDING') {
    if (!subjectTransaction) return null;
    return (
      <LendingLinkBody
        transaction={subjectTransaction}
        accounts={accounts}
        direction={lending.direction}
        mode={lending.mode}
        setMode={lending.setMode}
        counterparties={lending.counterparties}
        loadingCounterparties={lending.loadingCounterparties}
        selectedCpId={lending.selectedCpId}
        setSelectedCpId={lending.setSelectedCpId}
        newCpName={lending.newCpName}
        setNewCpName={lending.setNewCpName}
        amount={lending.amount}
        setAmount={lending.setAmount}
        entryDate={lending.entryDate}
        setEntryDate={lending.setEntryDate}
        expectedReturnDate={lending.expectedReturnDate}
        setExpectedReturnDate={lending.setExpectedReturnDate}
        notes={lending.notes}
        setNotes={lending.setNotes}
        unlinkedEntries={lending.unlinkedEntries}
        loadingExistingEntries={lending.loadingExistingEntries}
        attachingId={lending.attachingId}
        onAttach={lending.handleAttach}
      />
    );
  }

  if (kind === 'LOAN_PAYMENT') {
    if (!subjectTransaction) return null;
    return (
      <LoanPaymentLinkBody
        transaction={subjectTransaction}
        loans={loanPayment.loans}
        loadingLoans={loanPayment.loadingLoans}
        loanId={loanPayment.loanId}
        setLoanId={loanPayment.setLoanId}
        installments={loanPayment.installments}
        loadingSchedule={loanPayment.loadingSchedule}
        installmentSeq={loanPayment.installmentSeq}
        setInstallmentSeq={loanPayment.setInstallmentSeq}
        paymentDate={loanPayment.paymentDate}
        setPaymentDate={loanPayment.setPaymentDate}
        amount={loanPayment.amount}
        setAmount={loanPayment.setAmount}
      />
    );
  }

  return (
    <>
      <SelectedMembersList
        selectedTransactions={linkState.selectedTransactions}
        anchorId={linkState.anchorId}
        setAnchorId={linkState.setAnchorId}
        linkType={linkState.linkType ?? 'TRANSFER'}
        getAccount={linkState.getAccount}
        onRemoveTransaction={linkState.toggleSelectTransaction}
      />

      <CandidateSearchList
        candidateSearch={linkState.candidateSearch}
        setCandidateSearch={linkState.setCandidateSearch}
        loadingCandidates={linkState.loadingCandidates}
        filteredCandidates={linkState.filteredCandidates}
        getRuleHint={linkState.getRuleHint}
        getAccount={linkState.getAccount}
        onAddTransaction={linkState.toggleSelectTransaction}
      />
    </>
  );
}
