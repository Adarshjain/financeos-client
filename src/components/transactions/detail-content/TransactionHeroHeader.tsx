'use client';

import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Transaction } from '@/lib/transaction.types';
import { cn, formatMoney } from '@/lib/utils';

interface TransactionHeroHeaderProps {
  transaction: Transaction;
}

export function TransactionHeroHeader({ transaction }: TransactionHeroHeaderProps) {
  return (
    <DialogHeader className="relative p-3 pb-4 text-center sm:text-center bg-white dark:bg-slate-900 border-b border-slate-100/50 dark:border-slate-800/50 block">
      <div className="flex justify-center mb-3">
        <div
          className={cn(
            'p-3 rounded-full shadow-inner inline-block',
            transaction.amount >= 0
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-500'
              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
          )}
        >
          {transaction.amount >= 0 ? (
            <ArrowDownLeft className="h-6 w-6" />
          ) : (
            <ArrowUpRight className="h-6 w-6" />
          )}
        </div>
      </div>

      <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight mb-1 break-words text-center">
        {transaction.sourcedDescription}
      </DialogTitle>

      {transaction.description && (
        <div className="text-base text-slate-500 dark:text-slate-400">
          {transaction.description}
        </div>
      )}

      <div
        className={cn(
          'text-3xl font-black tracking-tight tabular-nums mt-3',
          transaction.amount >= 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400'
        )}
      >
        {transaction.amount >= 0 ? '' : '-'}
        {formatMoney(Math.abs(transaction.amount))}
      </div>

      {transaction.balance !== null && transaction.balance !== undefined && (
        <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-2 tabular-nums bg-slate-50 dark:bg-slate-900/50 inline-block px-2.5 py-1 rounded-full border border-slate-100 dark:border-slate-800/40">
          Balance: {formatMoney(transaction.balance)}
        </div>
      )}
    </DialogHeader>
  );
}
