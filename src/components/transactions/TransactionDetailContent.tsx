'use client';

import { Link2, PencilIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Account } from '@/lib/account.types';
import { Transaction } from '@/lib/transaction.types';

import { DeleteTransaction } from './DeleteTransaction';
import { LinkedTransactionsSection } from './detail-content/LinkedTransactionsSection';
import { TransactionHeroHeader } from './detail-content/TransactionHeroHeader';
import { TransactionMetadataGrid } from './detail-content/TransactionMetadataGrid';
import { useTransactionLinks } from './detail-content/useTransactionLinks';
import { ReviewTransaction } from './ReviewTransaction';
import { TransactionLinkDialog } from './TransactionLinkDialog';

interface TransactionDetailContentProps {
  transaction: Transaction;
  accounts: Account[];
  onEditClick: () => void;
  /** Dismisses the dialog and refreshes the parent list. */
  onCloseAndRefresh: () => void;
}

export const TransactionDetailContent = ({
  transaction,
  accounts,
  onEditClick,
  onCloseAndRefresh,
}: TransactionDetailContentProps) => {
  const hasLinks = (transaction.links?.length ?? 0) > 0;

  const {
    links,
    loadingLinks,
    linksError,
    linkDialogOpen,
    setLinkDialogOpen,
    unlinkingId,
    fetchLinks,
    handleUnlink,
  } = useTransactionLinks(transaction.id, hasLinks, onCloseAndRefresh);

  return (
    <div className="flex flex-col">
      {/* Modal Hero / Header */}
      <TransactionHeroHeader transaction={transaction} />

      {/* Content Details */}
      <div className="p-3 space-y-3 flex-1">
        <TransactionMetadataGrid
          transaction={transaction}
          accounts={accounts}
        />

        {/* Linked Transactions Section */}
        <LinkedTransactionsSection
          transaction={transaction}
          accounts={accounts}
          links={links}
          loadingLinks={loadingLinks}
          linksError={linksError}
          unlinkingId={unlinkingId}
          fetchLinks={fetchLinks}
          handleUnlink={handleUnlink}
        />

        <ReviewTransaction
          transaction={transaction}
          onSuccess={onCloseAndRefresh}
        />

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLinkDialogOpen(true)}
            className="h-9"
          >
            <Link2 className="h-3.5 w-3.5 text-indigo-500" />
            Link to…
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onEditClick}
            className="h-9"
          >
            <PencilIcon className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>

        <DeleteTransaction
          transaction={transaction}
          onSuccess={onCloseAndRefresh}
        />
      </div>

      <TransactionLinkDialog
        initialTransaction={transaction}
        accounts={accounts}
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        onSuccess={() => {
          fetchLinks();
          onCloseAndRefresh();
        }}
      />
    </div>
  );
};
