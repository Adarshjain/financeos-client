'use client';

import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CreditCard,
  LinkIcon,
  PencilIcon,
  Scale,
  Tag,
  TriangleAlert,
} from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Account } from '@/lib/account.types';
import { Transaction } from '@/lib/transaction.types';
import { cn, formatMoney } from '@/lib/utils';

import { DeleteTransaction } from './DeleteTransaction';
import { ReviewReasonBadges } from './ReviewReasonBadges';

interface TransactionDetailContentProps {
  transaction: Transaction;
  accounts: Account[];
  onEditClick: () => void;
  onDeleteSuccess: () => void;
}

export const TransactionDetailContent = ({
                                           transaction,
                                           accounts,
                                           onEditClick,
                                           onDeleteSuccess,
                                         }: TransactionDetailContentProps) => {

  const getAccountName = (accountId: string | undefined) => {
    if (!accountId) return '—';
    const account = accounts.find((a) => a.id === accountId);
    return account?.name || 'Unknown';
  };

  const getSource = () => {
    switch (transaction.source) {
      case 'gmail_transaction_alert':
        return 'Gmail Alert';
      case 'gmail_statement':
        return 'Gmail Statement';
      case 'manual':
        return 'Manual Entry';
      case 'file_upload':
        return 'File Upload';
      default:
        return 'Unknown Source';
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-y-auto max-h-[90vh] sm:max-h-[85vh] scrollbar-thin">
      {/* Modal Hero / Header */}
      <DialogHeader
        className="relative p-3 pb-4 text-center sm:text-center bg-white dark:bg-slate-900 border-b border-slate-100/50 dark:border-slate-800/50 block"
      >
        <div className="flex justify-center mb-3">
          <div
            className={cn(
              'p-3 rounded-full shadow-inner inline-block',
              transaction.amount >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-500'
                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400',
            )}
          >
            {transaction.amount >= 0 ? (
              <ArrowDownLeft className="h-6 w-6" />
            ) : (
              <ArrowUpRight className="h-6 w-6" />
            )}
          </div>
        </div>

        <DialogTitle
          className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight mb-1 break-words text-center">
          {transaction.sourcedDescription}
        </DialogTitle>

        {transaction.description && <div className="text-base text-slate-500 dark:text-slate-400">
          {transaction.description}
        </div>}

        <div
          className={cn(
            'text-3xl font-black tracking-tight tabular-nums mt-3',
            transaction.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
          )}
        >
          {transaction.amount >= 0 ? '' : '-'}{formatMoney(Math.abs(transaction.amount))}
        </div>

        {!transaction.balance && (
          <div
            className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-2 tabular-nums bg-slate-50 dark:bg-slate-900/50 inline-block px-2.5 py-1 rounded-full border border-slate-100 dark:border-slate-800/40">
            Balance: {formatMoney(transaction.balance)}
          </div>
        )}
      </DialogHeader>

      {/* Content Details */}
      <div className="p-3 space-y-3 flex-1">
        {/* Warnings / Status alerts */}
        {transaction.isTransactionExcluded && (
          <span
            className="flex items-start gap-2.5 py-3 px-4 rounded-xl border border-rose-200/50 bg-rose-50/50 dark:border-rose-900/30 dark:bg-rose-950/10 text-rose-800 dark:text-rose-400 text-xs leading-relaxed">
            <TriangleAlert className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
            <span className="font-bold">Transaction Excluded</span>
          </span>
        )}

        {transaction.isTransactionUnderMonitoring && (
          <div
            className="flex items-start gap-2.5 py-3 px-4 rounded-xl border border-amber-200/50 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10 text-amber-800 dark:text-amber-400 text-xs leading-relaxed">
            <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold mb-0.5">Under Monitoring</span>
              {transaction.monitoringReason && <>: <span
                className="italic font-medium text-amber-700 dark:text-amber-350">{transaction.monitoringReason}</span>
              </>}
            </div>
          </div>
        )}

        {/* Metadata Grid */}
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/30 dark:border-slate-800/40 divide-y divide-slate-100 dark:divide-slate-800/50 overflow-hidden shadow-sm">
          {/* Account */}
          <div className="flex items-center justify-between py-3 px-4 text-sm">
            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2 font-medium">
              <CreditCard className="h-4 w-4 text-slate-400" /> Account
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {getAccountName(transaction.accountId)}
            </span>
          </div>

          {/* Date */}
          <div className="flex items-center justify-between py-3 px-4 text-sm">
            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2 font-medium">
              <Calendar className="h-4 w-4 text-slate-400" /> Date
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {new Date(transaction.date).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          {/* Categories */}
          <div className="flex items-start flex-col justify-between py-3 px-4 text-sm gap-4">
            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2 font-medium mt-0.5">
              <Tag className="h-4 w-4 text-slate-400" /> Categories
            </span>
            <div className="flex flex-wrap gap-1">
              {(transaction.categories ?? []).length > 0 ? (
                transaction.categories?.map((category) => (
                  <Badge
                    variant="outline"
                    className="rounded-full px-2.5 text-[10px] py-0.5 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 bg-slate-50 dark:bg-slate-900"
                    key={category.id}
                  >
                    {category.name}
                  </Badge>
                ))
              ) : (
                <span className="text-slate-400 dark:text-slate-600 italic text-xs">None</span>
              )}
            </div>
          </div>

          {/* Source */}
          <div className="flex items-center justify-between py-3 px-4 text-sm">
            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2 font-medium">
              <Scale className="h-4 w-4 text-slate-400" /> Source
            </span>
            <div className="font-semibold text-slate-800 dark:text-slate-200">{getSource()}</div>
          </div>

          {/* Review Type */}
          <div className="flex items-center justify-between py-3 px-4 text-sm">
            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 text-slate-400" /> Review Status
            </span>
            <div className="flex flex-wrap gap-1 justify-end">
              <ReviewReasonBadges
                reviewType={transaction.reviewType}
                reviewReasons={transaction.reviewReasons}
              />
            </div>
          </div>
        </div>
        <DeleteTransaction transaction={transaction} onSuccess={onDeleteSuccess} />
      </div>

      {/* Modal Actions Footer */}
      <div
        className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/40 flex gap-2 shrink-0">


        <Button
          variant="outline"
          size="sm"
          onClick={onEditClick}
          className="flex-1 h-9 rounded-lg gap-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-850 transition-colors"
        >
          <PencilIcon className="h-3.5 w-3.5" />
          Edit
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9 rounded-lg gap-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-850 transition-colors"
        >
          <LinkIcon className="h-3.5 w-3.5" />
          Link
        </Button>
      </div>
    </div>
  );
};
