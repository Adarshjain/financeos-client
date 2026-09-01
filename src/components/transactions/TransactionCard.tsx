'use client';

import {Account} from '@/lib/account.types';
import {Category} from '@/lib/categories.types';
import {Transaction} from '@/lib/transaction.types';
import {cn, getAccountName} from '@/lib/utils';

import {ReviewReasonBadges} from './ReviewReasonBadges';
import {TransactionAmount} from './TransactionAmount';
import {TransactionCategoryBadges} from './TransactionCategoryBadges';
import {TransactionDetailDialog} from './TransactionDetailDialog';
import {TransactionLinkBadges} from './TransactionLinkBadges';
import {TransactionSelectCheckbox} from './TransactionSelectCheckbox';
import {TransactionSourceBadge} from './TransactionSourceBadge';

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
  const isExcluded = transaction.isTransactionExcluded;

  const trigger = (
        <div
            className={cn(
                'py-2 px-2 flex items-start justify-between relative gap-2 cursor-pointer transition-colors',
                'border-b border-slate-200/30 dark:border-slate-800/40 bg-white dark:bg-slate-900 overflow-hidden',
                'sm:rounded-lg sm:mb-2 sm:shadow-sm sm:p-3',
                transaction.isTransactionUnderMonitoring
                    ? 'bg-orange-50/50 dark:bg-orange-950/10 border-l-4 border-l-amber-500'
                    : '',
                isExcluded ? 'opacity-70 bg-slate-50/50 dark:bg-slate-950/25' : '',
                className,
            )}
        >
          {selectable && (
              <TransactionSelectCheckbox
                  transactionId={transaction.id}
                  selected={selected}
                  onToggle={onToggleSelect}
              />
          )}
          <div className="flex flex-col text-sm flex-1 min-w-0">
            <div
                className={cn(
                    'break-words text-slate-800 dark:text-slate-200 font-semibold leading-snug',
                    transaction.description ?? transaction.sourcedDescription ? 'mb-1' : '',
                )}
            >
              {transaction.description ?? transaction.sourcedDescription}
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>{getAccountName(accounts, transaction.accountId)}</span>
              {transaction.cardLabel || transaction.cardLast4 ? (
                <span className="text-2xs font-normal text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded tabular-nums">
                  {[transaction.cardLabel, transaction.cardLast4 ? `•••• ${transaction.cardLast4}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              ) : null}
            </div>
            <div className="flex flex-col items-start gap-1.5 mt-2.5">
              {showSource && <TransactionSourceBadge source={transaction.source}/>}
              <TransactionLinkBadges links={transaction.links}/>

              {!isExcluded && <TransactionCategoryBadges categories={transaction.categories}/>}
            </div>
          </div>
          <TransactionAmount
              amount={transaction.amount}
              balance={isExcluded ? null : transaction.balance}
          >
            <ReviewReasonBadges
                className="mt-2"
                reviewType={transaction.reviewType}
                reviewReasons={transaction.reviewReasons}
            />
          </TransactionAmount>
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
