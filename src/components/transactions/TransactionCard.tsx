'use client';

import { CornerDownRight, Link2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Account } from '@/lib/account.types';
import { Category } from '@/lib/categories.types';
import { Transaction } from '@/lib/transaction.types';
import { cn, formatMoney } from '@/lib/utils';

import { ReviewReasonBadges } from './ReviewReasonBadges';
import { TransactionDetailDialog } from './TransactionDetailDialog';

interface TransactionCardProps {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  className?: string;
  onMutate?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  showSource?: boolean;
}

export const TransactionCard = ({
  transaction,
  accounts,
  className,
  categories,
  onMutate,
  selectable,
  selected,
  onToggleSelect,
  showSource,
}: TransactionCardProps) => {
  const getAccountName = (accountId: string | undefined) => {
    if (!accountId) return '—';
    const account = accounts.find((a) => a.id === accountId);
    return account?.name || 'Unknown';
  };

  const trigger = (
    <div className="mb-2 rounded-xl border border-slate-200/30 dark:border-slate-800/40 bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 overflow-hidden hover:border-slate-300 dark:hover:border-slate-700/60 hover:shadow-md hover:shadow-slate-100/5 dark:hover:shadow-none">
      <div
        className={cn(
          'py-3 px-3 flex items-start justify-between relative gap-2 cursor-pointer transition-colors',
          transaction.isTransactionUnderMonitoring
            ? 'bg-orange-50/50 dark:bg-orange-950/10 border-l-4 border-l-amber-500'
            : '',
          transaction.isTransactionExcluded ? 'opacity-70 bg-slate-50/50 dark:bg-slate-950/25' : '',
          className,
        )}
      >
        {selectable && (
          <div
            className="flex items-center justify-center pr-2 self-center shrink-0 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
          >
            <Checkbox
              checked={selected}
              className="pointer-events-none"
              id={`select-${transaction.id}`}
            />
          </div>
        )}
        <div className="flex flex-col text-sm flex-1 min-w-0">
          <div
            className={cn(
              'break-words text-slate-800 dark:text-slate-200 font-semibold leading-snug',
              transaction.description ? 'mb-1' : '',
            )}
          >
            {transaction.description ?? transaction.sourcedDescription}
          </div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
            {getAccountName(transaction.accountId)}
          </div>
          <div className="flex flex-wrap gap-1.5 items-center mt-2.5">
            {showSource && transaction.source === 'gmail_transaction_alert' && (
              <Badge
                variant="info"
                className="text-[9px] py-0.5 px-2 font-bold tracking-wider rounded-md uppercase"
              >
                Gmail Alert
              </Badge>
            )}
            {showSource && transaction.source === 'gmail_statement' && (
              <Badge
                variant="warning"
                className="text-[9px] py-0.5 px-2 font-bold tracking-wider rounded-md uppercase"
              >
                Gmail Statement
              </Badge>
            )}
            {showSource && transaction.source === 'manual' && (
              <Badge
                variant="secondary"
                className="text-[9px] py-0.5 px-2 font-bold tracking-wider rounded-md uppercase"
              >
                Manual
              </Badge>
            )}

            {/* Link badges */}
            {transaction.links?.map((link) => {
              const isParentRole = [
                'Transfer out',
                'Card bill payment',
                'Refunded purchase',
                'Reversed',
                'Parent charge',
                'Purchase (EMI)',
              ].includes(link.roleLabel);

              return (
                <Badge
                  key={link.linkId}
                  variant="secondary"
                  className={cn(
                    'text-[9px] py-0.5 px-2 font-bold tracking-tight rounded-md inline-flex items-center gap-1 border',
                    isParentRole
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                      : 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-900/60',
                  )}
                >
                  {isParentRole ? (
                    <ShieldCheck className="h-2.5 w-2.5 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <CornerDownRight className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                  )}
                  <span>{isParentRole ? `Parent • ${link.roleLabel}` : link.roleLabel}</span>
                  {link.memberCount > 2 && <span className="opacity-70">({link.memberCount})</span>}
                </Badge>
              );
            })}

            {/* Review status badge */}
            <ReviewReasonBadges
              reviewType={transaction.reviewType}
              reviewReasons={transaction.reviewReasons}
            />

            {/* Categories */}
            {!transaction.isTransactionExcluded &&
              transaction.categories?.map((category) => (
                <Badge
                  variant="outline"
                  className="rounded-full px-2 text-[9px] py-0 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                  key={category.id}
                >
                  {category.name}
                </Badge>
              ))}
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
          {!transaction.isTransactionExcluded && transaction.balance !== null && transaction.balance !== undefined && (
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 tabular-nums">
              Bal: {formatMoney(transaction.balance)}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <TransactionDetailDialog
      transaction={transaction}
      accounts={accounts}
      categories={categories}
      onMutate={onMutate}
      trigger={trigger}
    />
  );
};
