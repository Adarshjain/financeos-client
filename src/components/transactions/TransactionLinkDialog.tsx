'use client';

import { Link2 } from 'lucide-react';
import * as React from 'react';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogFooterAction,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Account } from '@/lib/account.types';
import type { Transaction } from '@/lib/transaction.types';

import { LinkDialogBody } from './link-dialog/LinkDialogBody';
import { LinkTypeSelector } from './link-dialog/LinkTypeSelector';
import { useLoanPaymentLink } from './link-dialog/useLoanPaymentLink';
import { useTransactionLink } from './link-dialog/useTransactionLink';
import { useRecordLending } from './record-lending/useRecordLending';

const EMPTY_TXN_ARRAY: Transaction[] = [];

interface TransactionLinkDialogProps {
  initialTransaction?: Transaction;
  initialSelectedTransactions?: Transaction[];
  accounts: Account[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TransactionLinkDialog({
  initialTransaction,
  initialSelectedTransactions = EMPTY_TXN_ARRAY,
  accounts,
  open,
  onOpenChange,
  onSuccess,
}: TransactionLinkDialogProps) {
  const linkState = useTransactionLink({
    initialTransaction,
    initialSelectedTransactions,
    accounts,
    open,
    onOpenChange,
    onSuccess,
  });

  const { kind, subjectTransaction } = linkState;

  const lending = useRecordLending({
    transaction: subjectTransaction,
    open: open && kind === 'LENDING',
    onOpenChange,
    onSuccess,
  });

  const loanPayment = useLoanPaymentLink({
    transaction: subjectTransaction,
    open: open && kind === 'LOAN_PAYMENT',
    onOpenChange,
    onSuccess,
  });

  let primaryAction: DialogFooterAction;
  if (kind === 'LENDING') {
    primaryAction =
      lending.mode === 'existing'
        ? { label: 'Attach from list', disabled: true }
        : {
            label: lending.submitting ? 'Saving...' : 'Save entry',
            onClick: lending.handleSubmitNew,
            disabled: !lending.canSubmitNew || lending.submitting,
          };
  } else if (kind === 'LOAN_PAYMENT') {
    primaryAction = {
      label: loanPayment.submitting ? 'Settling...' : 'Settle installment',
      onClick: loanPayment.handleSubmit,
      disabled: !loanPayment.canSubmit || loanPayment.submitting,
    };
  } else {
    primaryAction = {
      label: linkState.submitting ? 'Linking...' : 'Link Transactions',
      onClick: linkState.handleSubmit,
      disabled:
        linkState.submitting || linkState.selectedTransactions.length < 2 || !linkState.anchorId,
    };
  }

  const anyBusy = linkState.submitting || lending.submitting || loanPayment.submitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Link2 className="h-5 w-5 text-indigo-500" />
            Link
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Connect this transaction to other transactions, a person&apos;s ledger entry, or a
            loan installment.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-2">
          <LinkTypeSelector
            kind={kind}
            setKind={linkState.setKind}
            note={linkState.note}
            setNote={linkState.setNote}
            alignRefundCategories={linkState.alignRefundCategories}
            setAlignRefundCategories={linkState.setAlignRefundCategories}
            disabledKinds={linkState.disabledKinds}
          />

          <LinkDialogBody
            linkState={linkState}
            lending={lending}
            loanPayment={loanPayment}
            accounts={accounts}
          />
        </DialogBody>

        <DialogFooter
          primaryAction={primaryAction}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => onOpenChange(false),
            disabled: anyBusy,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
