'use client';

import { Loader2, PlusIcon } from 'lucide-react';
import { Fragment } from 'react';

import { AccountFormWrapper } from '@/components/accounts/AccountFormWrapper';
import { buttonVariants } from '@/components/ui/button';
import { Account } from '@/lib/account.types';
import { PagedTransaction } from '@/lib/transaction.types';
import { formatDate } from '@/lib/utils';

import { getSelectableAccounts, TRANSACTION_ACCOUNT_TYPES } from '../crud/transactionCRUD.helpers';
import { TransactionCard } from '../TransactionCard';

interface TransactionListFeedProps {
  loading: boolean;
  pagedData: PagedTransaction | null;
  hasFiltersOrSearch: boolean;
  accounts: Account[];
  isSelectionMode: boolean;
  selectedTxnIds: Set<string>;
  onReload: () => void;
  onToggleSelect: (id: string) => void;
}

export function TransactionListFeed({
  loading,
  pagedData,
  hasFiltersOrSearch,
  accounts,
  isSelectionMode,
  selectedTxnIds,
  onReload,
  onToggleSelect,
}: TransactionListFeedProps) {
  if (loading && !pagedData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin mb-2" />
        <p className="text-sm">Loading transactions...</p>
      </div>
    );
  }

  if (!pagedData || pagedData.content.length === 0) {
    // Nothing can be recorded without an open bank/card/wallet account, so
    // that is the step to point at. A filter still wins when such accounts
    // exist (it may be hiding real transactions), but never when there are
    // no accounts at all, since then there is nothing for it to hide.
    const needsAccount =
      getSelectableAccounts(accounts).length === 0 &&
      (!hasFiltersOrSearch || accounts.length === 0);
    if (needsAccount) {
      return (
        <div className="text-center py-16 px-4 space-y-3">
          <div>
            <p className="text-slate-600 dark:text-slate-400 mb-2 font-medium">
              Add an account to get started
            </p>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Transactions are recorded against a bank account, credit card or wallet. Add one to start tracking.
            </p>
          </div>
          <AccountFormWrapper
            triggerClassName={buttonVariants({ size: 'sm' })}
            allowedTypes={TRANSACTION_ACCOUNT_TYPES}
          >
            <PlusIcon data-icon="inline-start" />
            Add account
          </AccountFormWrapper>
        </div>
      );
    }
    return (
      <div className="text-center py-16 px-4">
        <p className="text-slate-600 dark:text-slate-400 mb-2 font-medium">
          No transactions found
        </p>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          {hasFiltersOrSearch
            ? 'Try adjusting your filters or search query to find what you are looking for.'
            : 'Add your first transaction to start tracking!'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {pagedData.content.map((transaction, index) => {
        const showDate =
          index === 0 || transaction.date !== pagedData.content[index - 1].date;
        return (
          <Fragment key={transaction.id}>
            {showDate && (
              <div className="text-sm font-medium pl-2 pt-2 sticky top-0 bg-slate-50 dark:bg-slate-900 dark:text-slate-300 z-10">
                {formatDate(transaction.date)}
              </div>
            )}
            <TransactionCard
              accounts={accounts}
              transaction={transaction}
              onMutate={onReload}
              selectable={isSelectionMode || selectedTxnIds.size > 0}
              selected={selectedTxnIds.has(transaction.id)}
              onToggleSelect={() => onToggleSelect(transaction.id)}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
