'use client';
import { LinkIcon, PencilIcon, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteTransaction } from '@/actions/transactions';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { TransactionFormWrapper } from '@/components/transactions/TransactionFormWrapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Account } from '@/lib/account.types';
import { Category } from '@/lib/categories.types';
import { Transaction } from '@/lib/transaction.types';
import { cn, formatMoney } from '@/lib/utils';

interface TransactionCardProps {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  className?: string;
}

const DeleteTransaction = ({ transaction }: { transaction: Transaction }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await deleteTransaction(transaction.id);
      toast.success('Transaction deleted!');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const trigger = (
    <Button variant="outline" size="sm" className="flex-1">
      <Trash2 className="h-4 w-4" />
      Delete
    </Button>
  );

  return <ConfirmationDialog
    title="Delete Transaction?"
    description={
      transaction.source !== 'manual' ? 'This is not a manually created transaction. It is discouraged to delete this' : 'Are you sure you want to delete this transaction?'
    }
    primaryActionText={isDeleting ? 'Deleting...' : 'Delete'}
    trigger={trigger}
    primaryAction={handleDelete}
    loading={isDeleting}
  />;
};

export const TransactionCard = ({ transaction, accounts, className, categories }: TransactionCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const getAccountName = (accountId: string | undefined) => {
    if (!accountId) return '—';
    const account = accounts.find((a) => a.id === accountId);
    return account?.name || 'Unknown';
  };

  return <div className="bg-gray-200 mb-2 rounded-md">
    <div
      className={cn(
        'py-2 flex items-start justify-between border-2 rounded-md relative px-2 bg-white',
        transaction.isTransactionUnderMonitoring ? 'bg-orange-50 border-orange-200' : '',
        transaction.isTransactionExcluded ? 'opacity-80' : '',
        className,
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex flex-col gap-1 text-sm">
        <div className="break-all font-medium">{transaction.description ?? transaction.sourcedDescription}</div>
        {expanded && transaction.sourcedDescription && (
          <div className="break-all font-medium">{transaction.sourcedDescription}</div>)}
        <div className="min-w-max">{getAccountName(transaction.accountId)}</div>
        {!transaction.isTransactionExcluded && <div>{transaction.categories?.map(
          category => <Badge
            variant="outline"
            className="mr-1 rounded px-1"
            key={category.id}
          >{category.name}</Badge>,
        )}</div>}
      </div>
      <div className="flex flex-col">
        <div
          className={cn(
            'font-bold text-lg whitespace-nowrap text-right min-w-[100px]',
            transaction.amount >= 0 ? 'text-emerald-500' : 'text-rose-500',
          )}>{formatMoney(Math.abs(transaction.amount))}</div>
        {!transaction.isTransactionExcluded &&
          <div className="text-right text-base">{formatMoney(transaction.balance)}</div>}
        {expanded && transaction.isTransactionExcluded ?
          <div className="text-xs justify-end items-center gap-0.5 mt-1 flex text-yellow-700"><TriangleAlert
            size={12} />Excluded</div> : null}
        {expanded && transaction.isTransactionUnderMonitoring ?
          <div className="text-xs justify-end items-center gap-0.5 mt-1 flex text-yellow-700"><TriangleAlert
            size={12} />Monitoring
          </div> : null}
      </div>
    </div>
    {expanded && (<div className="flex gap-2 p-2">
      <DeleteTransaction transaction={transaction} />
      <TransactionFormWrapper
        categories={categories}
        accounts={accounts}
        transaction={transaction}
        trigger={<Button variant="outline" size="sm" className="flex-1">
          <PencilIcon className="h-4 w-4" />
          Edit
        </Button>}
      />
      <Button variant="outline" size="sm" className="flex-1">
        <LinkIcon className="h-4 w-4" />
        Link
      </Button>
    </div>)}
  </div>;
};
