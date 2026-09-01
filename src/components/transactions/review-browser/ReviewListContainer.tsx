'use client';

import { Loader2 } from 'lucide-react';
import { Fragment } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Account } from '@/lib/account.types';
import { Category } from '@/lib/categories.types';
import { PagedTransaction } from '@/lib/transaction.types';
import { formatDate } from '@/lib/utils';

import { TransactionCard } from '../TransactionCard';

interface ReviewListContainerProps {
  loading: boolean;
  pagedData: PagedTransaction | null;
  selectedIds: string[];
  appliedAccountCount: number;
  selectableAccountCount: number;
  accounts: Account[];
  categories: Category[];
  onSelectAllPage: (checked: boolean | 'indeterminate') => void;
  onToggleSelect: (id: string) => void;
  onMutate: () => void;
}

export function ReviewListContainer({
  loading,
  pagedData,
  selectedIds,
  appliedAccountCount,
  selectableAccountCount,
  accounts,
  categories,
  onSelectAllPage,
  onToggleSelect,
  onMutate,
}: ReviewListContainerProps) {
  if (loading && !pagedData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin mb-2" />
        <p className="text-sm">Loading transactions for review...</p>
      </div>
    );
  }

  if (!pagedData || pagedData.content.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-slate-600 dark:text-slate-400 mb-2 font-medium">
          No transactions need review
        </p>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          {appliedAccountCount < selectableAccountCount
            ? 'Try adjusting your account selection to find pending transactions.'
            : 'All transactions for the selected periods have been verified!'}
        </p>
      </div>
    );
  }

  const isAllPageSelected =
    pagedData.content.length > 0 &&
    pagedData.content.every((t) => selectedIds.includes(t.id));
  const isSomePageSelected = pagedData.content.some((t) => selectedIds.includes(t.id));

  return (
    <div className="space-y-1 px-2">
      {/* Master Checkbox Header */}
      <div className="flex items-center mb-2 gap-3.5 px-3 pt-1">
        <Checkbox
          id="select-all-page"
          checked={
            isAllPageSelected ? true : isSomePageSelected ? 'indeterminate' : false
          }
          onCheckedChange={onSelectAllPage}
        />
        <label
          htmlFor="select-all-page"
          className="text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none"
        >
          Select All on Page
        </label>
      </div>

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
              categories={categories}
              accounts={accounts}
              transaction={transaction}
              onMutate={onMutate}
              selectable
              selected={selectedIds.includes(transaction.id)}
              onToggleSelect={() => onToggleSelect(transaction.id)}
              showSource
            />
          </Fragment>
        );
      })}
    </div>
  );
}
