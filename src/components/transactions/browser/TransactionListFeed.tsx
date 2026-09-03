'use client';

import { Loader2 } from 'lucide-react';
import { Fragment } from 'react';

import { Account } from '@/lib/account.types';
import { PagedTransaction } from '@/lib/transaction.types';
import { formatDate } from '@/lib/utils';

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
