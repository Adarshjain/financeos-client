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
  onMutate?: () => void;
}

const DeleteTransaction = ({ transaction, onSuccess }: { transaction: Transaction; onSuccess?: () => void }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await deleteTransaction(transaction.id);
      toast.success('Transaction deleted!');
      onSuccess?.();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const trigger = (
    <Button variant="outline" size="sm" className="flex-1 rounded-lg hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900/30 gap-1.5 transition-colors text-xs font-semibold">
      <Trash2 className="h-3.5 w-3.5" />
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

export const TransactionCard = ({ transaction, accounts, className, categories, onMutate }: TransactionCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const getAccountName = (accountId: string | undefined) => {
    if (!accountId) return '—';
    const account = accounts.find((a) => a.id === accountId);
    return account?.name || 'Unknown';
  };

  return (
    <div className="mb-2 rounded-xl border border-slate-200/30 dark:border-slate-800/40 bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 overflow-hidden hover:border-slate-300 dark:hover:border-slate-700/60 hover:shadow-md hover:shadow-slate-100/5 dark:hover:shadow-none">
      <div
        className={cn(
          'py-3 px-3 flex items-start justify-between relative gap-2 cursor-pointer transition-colors',
          transaction.isTransactionUnderMonitoring ? 'bg-orange-50/50 dark:bg-orange-950/10 border-l-4 border-l-amber-500' : '',
          transaction.isTransactionExcluded ? 'opacity-70 bg-slate-50/50 dark:bg-slate-950/20' : '',
          className,
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-col text-sm flex-1 min-w-0">
          <div
            className={cn('break-words text-slate-800 dark:text-slate-200 font-semibold leading-snug', transaction.description ? 'mb-1' : '')}
          >
            {expanded ? transaction.description : (transaction.description ?? transaction.sourcedDescription)}
          </div>
          {expanded && transaction.sourcedDescription && (
            <div className="break-words text-xs text-slate-500 dark:text-slate-400 italic my-1">
              Sourced: {transaction.sourcedDescription}
            </div>
          )}
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
            {getAccountName(transaction.accountId)}
          </div>
          <div className="flex flex-wrap gap-1.5 items-center mt-2.5">
            {/* Source badge */}
            {expanded && transaction.source === 'gmail_transaction_alert' && (
              <Badge variant="info" className="text-[9px] py-0.5 px-2 font-bold tracking-wider rounded-md uppercase">
                Gmail Alert
              </Badge>
            )}
            {expanded && transaction.source === 'gmail_statement' && (
              <Badge variant="warning" className="text-[9px] py-0.5 px-2 font-bold tracking-wider rounded-md uppercase">
                Gmail Statement
              </Badge>
            )}
            {expanded && transaction.source === 'manual' && (
              <Badge variant="secondary" className="text-[9px] py-0.5 px-2 font-bold tracking-wider rounded-md uppercase">
                Manual
              </Badge>
            )}

            {/* Review status badge */}
            {transaction.reviewType === 'NEEDS_REVIEW' && (
              <Badge variant="warning" className="text-[9px] py-0 px-2 font-bold rounded-md">
                Needs Review
              </Badge>
            )}

            {/* Categories */}
            {!transaction.isTransactionExcluded && transaction.categories?.map(
              category => (
                <Badge
                  variant="outline"
                  className="rounded-full px-2 text-[9px] py-0 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                  key={category.id}
                >
                  {category.name}
                </Badge>
              )
            )}
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0 pl-2">
          <div
            className={cn(
              'font-black text-base whitespace-nowrap tabular-nums tracking-tight',
              transaction.amount >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500',
            )}
          >
            {transaction.amount >= 0 ? '+' : '-'} {formatMoney(Math.abs(transaction.amount))}
          </div>
          {!transaction.isTransactionExcluded && (
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 tabular-nums">
              Bal: {formatMoney(transaction.balance)}
            </div>
          )}
          {expanded && transaction.isTransactionExcluded ? (
            <div className="text-[10px] justify-end items-center gap-1 mt-1.5 flex text-rose-500 font-semibold bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded">
              <TriangleAlert size={10} />
              Excluded
            </div>
          ) : null}
          {expanded && transaction.isTransactionUnderMonitoring ? (
            <div className="text-[10px] justify-end items-center gap-1 mt-1.5 flex text-amber-600 dark:text-amber-500 font-semibold bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded">
              <TriangleAlert size={10} />
              Monitoring
            </div>
          ) : null}
        </div>
      </div>
      {expanded && (
        <div className="flex gap-2 p-2 bg-slate-50 dark:bg-slate-900/30 rounded-b-xl border-t border-slate-100 dark:border-slate-800/40">
          <DeleteTransaction transaction={transaction} onSuccess={onMutate} />
          <TransactionFormWrapper
            categories={categories}
            accounts={accounts}
            transaction={transaction}
            onSuccess={onMutate}
            trigger={
              <Button variant="outline" size="sm" className="flex-1 rounded-lg gap-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <PencilIcon className="h-3.5 w-3.5" />
                Edit
              </Button>
            }
          />
          <Button variant="outline" size="sm" className="flex-1 rounded-lg gap-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <LinkIcon className="h-3.5 w-3.5" />
            Link
          </Button>
        </div>
      )}
    </div>
  );
};
