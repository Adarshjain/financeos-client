'use client';

import { Link2 } from 'lucide-react';
import * as React from 'react';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Account } from '@/lib/account.types';
import type { Transaction } from '@/lib/transaction.types';

import { CandidateSearchList } from './link-dialog/CandidateSearchList';
import { LinkTypeSelector } from './link-dialog/LinkTypeSelector';
import { SelectedMembersList } from './link-dialog/SelectedMembersList';
import { useTransactionLink } from './link-dialog/useTransactionLink';

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
  const {
    linkType,
    setLinkType,
    note,
    setNote,
    alignRefundCategories,
    setAlignRefundCategories,
    selectedTransactions,
    anchorId,
    setAnchorId,
    candidateSearch,
    setCandidateSearch,
    loadingCandidates,
    filteredCandidates,
    submitting,
    getAccount,
    toggleSelectTransaction,
    handleSubmit,
    getRuleHint,
  } = useTransactionLink({
    initialTransaction,
    initialSelectedTransactions,
    accounts,
    open,
    onOpenChange,
    onSuccess,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Link2 className="h-5 w-5 text-indigo-500" />
            Link Transactions
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Establish settlement link accounting relationships between transactions.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-2">
          {/* Link Type & Settings */}
          <LinkTypeSelector
            linkType={linkType}
            setLinkType={setLinkType}
            note={note}
            setNote={setNote}
            alignRefundCategories={alignRefundCategories}
            setAlignRefundCategories={setAlignRefundCategories}
          />

          {/* Member Selection Section */}
          <SelectedMembersList
            selectedTransactions={selectedTransactions}
            anchorId={anchorId}
            setAnchorId={setAnchorId}
            linkType={linkType}
            getAccount={getAccount}
            onRemoveTransaction={toggleSelectTransaction}
          />

          {/* Add Counterparts Search */}
          <CandidateSearchList
            candidateSearch={candidateSearch}
            setCandidateSearch={setCandidateSearch}
            loadingCandidates={loadingCandidates}
            filteredCandidates={filteredCandidates}
            getRuleHint={getRuleHint}
            getAccount={getAccount}
            onAddTransaction={toggleSelectTransaction}
          />
        </DialogBody>

        <DialogFooter
          primaryAction={{
            label: submitting ? 'Linking...' : 'Link Transactions',
            onClick: handleSubmit,
            disabled: submitting || selectedTransactions.length < 2 || !anchorId,
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => onOpenChange(false),
            disabled: submitting,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
