'use client';

import React from 'react';

import { Dialog } from '@/components/ds/Dialog/Dialog';
import { Select, type SelectGroup } from '@/components/ds/Select/Select';
import { showToast } from '@/components/ds/Toast/Toast';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { isRecordKind, type LinkKind, type Transaction } from '@/lib/transaction.types';

import { DividendLinkBody } from './DividendLinkBody';
import { EpfWithdrawalLinkBody } from './EpfWithdrawalLinkBody';
import { LendingLinkBody, type LendingMode } from './LendingLinkBody';
import {
  buildLinkRequest,
  disabledLinkKinds,
  LINK_TYPE_LABELS,
  linkDescription,
  linkProblem,
  linkTitle,
  linkTypesFor,
  RECORD_KIND_LABELS,
} from './linkModel';
import { LoanPaymentLinkBody } from './LoanPaymentLinkBody';
import { TransactionsLinkBody } from './TransactionsLinkBody';
import { useDividendLink } from './useDividendLink';
import { useEpfWithdrawalLink } from './useEpfWithdrawalLink';
import { useLinkMembers } from './useLinkMembers';
import { useLoanPaymentLink } from './useLoanPaymentLink';
import { useRecordLending } from './useRecordLending';
import { useCreateTransactionLink } from './useTransactionLinkMutations';

export interface LinkTransactionsDialogProps {
  /** One transaction opens "Link … to…"; several (from the selection bar) open the multi-transaction form. */
  transactions: readonly Transaction[];
  onClose: () => void;
  /** Something was linked: the page refreshes what it shows. The dialog closes itself. */
  onLinked: () => void;
}

/**
 * The one Link dialog: tie transactions to each other (transfer, card bill payment, refund, reversal, fee,
 * installment), or attach one transaction to a lending entry, a loan installment, a dividend or an EPF withdrawal.
 */
export function LinkTransactionsDialog({ transactions, onClose, onLinked }: LinkTransactionsDialogProps) {
  const multi = transactions.length > 1;
  const subject = multi ? undefined : transactions[0];
  const { data: accounts = [] } = useAccounts();
  const [kind, setKind] = React.useState<LinkKind>('TRANSFER');
  const [lendingMode, setLendingMode] = React.useState<LendingMode>('new');
  const [entryId, setEntryId] = React.useState('');
  const state = useLinkMembers(transactions);

  const finish = () => {
    onClose();
    onLinked();
  };
  const onOpenChange = (open: boolean) => {
    if (!open) onClose();
  };
  const createLink = useCreateTransactionLink(finish);

  const lending = useRecordLending({
    transaction: subject,
    open: kind === 'LENDING',
    onOpenChange,
    onSuccess: onLinked,
  });
  const loanPayment = useLoanPaymentLink({
    transaction: subject,
    open: kind === 'LOAN_PAYMENT',
    onOpenChange,
    onSuccess: onLinked,
  });
  const dividend = useDividendLink({
    transaction: subject,
    open: kind === 'DIVIDEND',
    onOpenChange,
    onSuccess: onLinked,
  });
  const epf = useEpfWithdrawalLink({
    transaction: subject,
    open: kind === 'EPF_WITHDRAWAL',
    onOpenChange,
    onSuccess: onLinked,
  });

  const disabled = disabledLinkKinds(subject, transactions.length);
  const groups: SelectGroup[] = [
    { name: 'Between transactions', options: linkTypesFor(subject).map((t) => ({ value: t, label: LINK_TYPE_LABELS[t] })) },
    {
      name: 'Record as',
      options: (Object.keys(RECORD_KIND_LABELS) as (keyof typeof RECORD_KIND_LABELS)[]).map((k) => ({
        value: k,
        label: RECORD_KIND_LABELS[k],
        disabled: Boolean(disabled[k]),
        disabledReason: disabled[k],
      })),
    },
  ];

  const submitLink = () => {
    if (isRecordKind(kind)) return;
    const problem = linkProblem(state.members.length, state.anchorId);
    if (problem) {
      showToast(problem, { tone: 'danger' });
      return;
    }
    createLink.mutate(
      buildLinkRequest({
        type: kind,
        members: state.members,
        anchorId: state.anchorId,
        note: state.note,
        alignRefundCategories: state.alignRefundCategories,
      }),
    );
  };

  let primary: React.ComponentProps<typeof Dialog.Content>['primary'];
  let busy = createLink.isPending;
  if (kind === 'LENDING') {
    busy = lending.submitting || lending.attachingId !== null;
    primary =
      lendingMode === 'new'
        ? { label: 'Record and link', onSelect: lending.handleSubmitNew, disabled: !lending.canSubmitNew, loading: lending.submitting }
        : {
            label: 'Link to entry',
            onSelect: () => lending.handleAttach(entryId),
            disabled: !lending.unlinkedEntries.some((e) => e.id === entryId),
            loading: lending.attachingId !== null,
          };
  } else if (kind === 'LOAN_PAYMENT') {
    busy = loanPayment.submitting;
    primary = {
      label: loanPayment.installmentSeq !== undefined ? `Settle EMI #${loanPayment.installmentSeq}` : 'Settle EMI',
      onSelect: loanPayment.handleSubmit,
      disabled: !loanPayment.canSubmit,
      loading: loanPayment.submitting,
    };
  } else if (kind === 'DIVIDEND') {
    busy = dividend.submitting;
    primary = {
      label: dividend.mode === 'new' ? 'Record and link' : 'Link dividend',
      onSelect: dividend.handleSubmit,
      disabled: !dividend.canSubmit,
      loading: dividend.submitting,
    };
  } else if (kind === 'EPF_WITHDRAWAL') {
    busy = epf.submitting;
    primary = {
      label: epf.mode === 'new' ? 'Record and link' : 'Link',
      onSelect: epf.handleSubmit,
      disabled: !epf.canSubmit,
      loading: epf.submitting,
    };
  } else {
    primary = {
      label: multi ? `Link ${state.members.length}` : 'Link transactions',
      onSelect: submitLink,
      disabled: state.members.length < 2 || !state.anchorId,
      loading: createLink.isPending,
    };
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <Dialog.Content
        size="md"
        title={linkTitle(transactions)}
        description={linkDescription(kind, multi)}
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: busy }}
        primary={primary}
      >
        <Dialog.Body>
          <div className="flex flex-col gap-space-8 desk:gap-space-16">
            <Select label="Type" groups={groups} value={kind} onValueChange={(v) => setKind(v as LinkKind)} />
            {kind === 'LENDING' ? (
              <LendingLinkBody
                lending={lending}
                mode={lendingMode}
                onModeChange={setLendingMode}
                entryId={entryId}
                onEntryChange={setEntryId}
              />
            ) : kind === 'LOAN_PAYMENT' ? (
              <LoanPaymentLinkBody loanPayment={loanPayment} />
            ) : kind === 'DIVIDEND' ? (
              <DividendLinkBody dividend={dividend} />
            ) : kind === 'EPF_WITHDRAWAL' ? (
              <EpfWithdrawalLinkBody epf={epf} />
            ) : (
              <TransactionsLinkBody type={kind} state={state} accounts={accounts} multi={multi} />
            )}
          </div>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
