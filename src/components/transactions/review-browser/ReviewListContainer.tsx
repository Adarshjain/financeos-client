'use client';

import { Check, Loader2, Trash2 } from 'lucide-react';
import { Fragment, useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { SwipeActionRow } from '@/components/ui/swipe-action-row';
import { Account } from '@/lib/account.types';
import { PagedTransaction, Transaction } from '@/lib/transaction.types';
import { formatDate } from '@/lib/utils';

import { DeleteTransactionDialog } from '../DeleteTransactionDialog';
import { ReviewTransactionDialog } from '../ReviewTransactionDialog';
import { TransactionCard } from '../TransactionCard';

interface ReviewListContainerProps {
  loading: boolean;
  pagedData: PagedTransaction | null;
  selectedIds: string[];
  appliedAccountCount: number;
  selectableAccountCount: number;
  accounts: Account[];
  onSelectAllPage: (checked: boolean | 'indeterminate') => void;
  onToggleSelect: (id: string) => void;
  onMutate: () => void;
}

type SwipeTarget = { transaction: Transaction; action: 'approve' | 'delete' };

export function ReviewListContainer({
  loading,
  pagedData,
  selectedIds,
  appliedAccountCount,
  selectableAccountCount,
  accounts,
  onSelectAllPage,
  onToggleSelect,
  onMutate,
}: ReviewListContainerProps) {
  // One dialog pair for the whole list; a card swipe points it at that card.
  const [swipeTarget, setSwipeTarget] = useState<SwipeTarget | null>(null);

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

  const closeSwipeDialog = (open: boolean) => {
    if (!open) setSwipeTarget(null);
  };

  // The row is leaving the queue: refresh, and drop it from any bulk
  // selection so the batch bar never targets an id that is already gone.
  const handleSwipeSuccess = () => {
    const id = swipeTarget?.transaction.id;
    if (id && selectedIds.includes(id)) onToggleSelect(id);
    onMutate();
  };

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
        // Same invariant as ReviewTransaction: nothing to approve without a reason.
        const canApprove = (transaction.reviewReasons?.length ?? 0) > 0;
        return (
          <Fragment key={transaction.id}>
            {showDate && (
              <div className="text-sm font-medium pl-2 pt-2 sticky top-0 bg-slate-50 dark:bg-slate-900 dark:text-slate-300 z-10">
                {formatDate(transaction.date)}
              </div>
            )}
            <SwipeActionRow
              className="sm:rounded-lg sm:mb-2"
              leading={
                canApprove
                  ? {
                      label: 'Approve',
                      icon: Check,
                      tone: 'success',
                      onCommit: () => setSwipeTarget({ transaction, action: 'approve' }),
                    }
                  : undefined
              }
              trailing={{
                label: 'Delete',
                icon: Trash2,
                tone: 'danger',
                onCommit: () => setSwipeTarget({ transaction, action: 'delete' }),
              }}
            >
              <TransactionCard
                accounts={accounts}
                transaction={transaction}
                className="sm:mb-0"
                onMutate={onMutate}
                selectable
                selected={selectedIds.includes(transaction.id)}
                onToggleSelect={() => onToggleSelect(transaction.id)}
                showSource
              />
            </SwipeActionRow>
          </Fragment>
        );
      })}

      <ReviewTransactionDialog
        transaction={swipeTarget?.transaction}
        open={swipeTarget?.action === 'approve'}
        onOpenChange={closeSwipeDialog}
        onSuccess={handleSwipeSuccess}
      />
      <DeleteTransactionDialog
        transaction={swipeTarget?.transaction}
        open={swipeTarget?.action === 'delete'}
        onOpenChange={closeSwipeDialog}
        onSuccess={handleSwipeSuccess}
      />
    </div>
  );
}
