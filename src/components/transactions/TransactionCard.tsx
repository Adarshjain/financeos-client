'use client';
import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import { TransactionFormWrapper } from '@/components/transactions/TransactionFormWrapper';
import { Badge } from '@/components/ui/badge';
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

export const TransactionCard = ({ transaction, accounts, className, categories }: TransactionCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const getAccountName = (accountId: string | undefined) => {
    if (!accountId) return '—';
    const account = accounts.find((a) => a.id === accountId);
    return account?.name || 'Unknown';
  };


  return <>

    <div
      className={cn(
        'py-2 flex items-start justify-between border-2 rounded-md relative mb-2 px-2 ',
        transaction.isTransactionUnderMonitoring ? 'bg-orange-50 border-orange-200' : '',
        transaction.isTransactionExcluded ? 'opacity-80' : '',
        className,
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex flex-col gap-1 text-sm">
        <div className="break-all font-medium">{transaction.description ?? transaction.sourcedDescription}</div>
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
        {transaction.isTransactionExcluded ?
          <div className="text-xs justify-end items-center gap-0.5 mt-1 flex text-yellow-700"><TriangleAlert
            size={12} />Excluded</div> : null}
        {transaction.isTransactionUnderMonitoring ?
          <div className="text-xs justify-end items-center gap-0.5 mt-1 flex"><TriangleAlert size={12} />Monitoring
          </div> : null}
      </div>
    </div>
    {expanded && (<div>
      <TransactionFormWrapper
        categories={categories}
        accounts={accounts}
        transaction={transaction}
        trigger={<div>Edit</div>}
      />
    </div>)}
  </>;
};
