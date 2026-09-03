'use client';

import {
  AlertCircle,
  Calendar,
  CreditCard,
  Scale,
  Tag,
  TriangleAlert,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Account } from '@/lib/account.types';
import { Transaction } from '@/lib/transaction.types';
import { getAccountName } from '@/lib/utils';

import { ReviewReasonBadges } from '../ReviewReasonBadges';

interface TransactionMetadataGridProps {
  transaction: Transaction;
  accounts: Account[];
}

export function TransactionMetadataGrid({
  transaction,
  accounts,
}: TransactionMetadataGridProps) {
  const accountName = (accountId: string | undefined) =>
    getAccountName(accounts, accountId);

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
    <>
      {/* Warnings / Status alerts */}
      {transaction.isTransactionExcluded && (
        <span className="flex items-start gap-2.5 py-3 px-4 rounded-xl border border-rose-200/50 bg-rose-50/50 dark:border-rose-900/30 dark:bg-rose-950/10 text-rose-800 dark:text-rose-400 text-xs leading-relaxed">
          <TriangleAlert className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
          <span className="font-bold">Transaction Excluded</span>
        </span>
      )}

      {transaction.isTransactionUnderMonitoring && (
        <div className="flex items-start gap-2.5 py-3 px-4 rounded-xl border border-amber-200/50 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10 text-amber-800 dark:text-amber-400 text-xs leading-relaxed">
          <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold mb-0.5">Under Monitoring</span>
            {transaction.monitoringReason && (
              <>
                :{' '}
                <span className="italic font-medium text-amber-700 dark:text-amber-350">
                  {transaction.monitoringReason}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Metadata Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/30 dark:border-slate-800/40 divide-y divide-slate-100 dark:divide-slate-800/50 overflow-hidden shadow-sm">
        {/* Account */}
        <div className="flex items-center justify-between py-3 px-4 text-sm">
          <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2 font-medium">
            <CreditCard className="h-4 w-4 text-slate-400" /> Account
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {accountName(transaction.accountId)}
          </span>
        </div>

        {/* Card */}
        {(transaction.cardLabel || transaction.cardLast4) && (
          <div className="flex items-center justify-between py-3 px-4 text-sm">
            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2 font-medium">
              <CreditCard className="h-4 w-4 text-slate-400" /> Card
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
              {[
                transaction.cardLabel,
                transaction.cardLast4 ? `•••• ${transaction.cardLast4}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
        )}

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
        <div className="flex items-start justify-between py-3 px-4 text-sm gap-4">
          <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2 font-medium mt-0.5">
            <Tag className="h-4 w-4 text-slate-400" /> Categories
          </span>
          <div className="flex flex-wrap gap-1 flex-end">
            {(transaction.categories ?? []).length > 0 ? (
              transaction.categories?.map((category) => (
                <Badge
                  variant="outline"
                  className="rounded-full px-2.5 text-2xs py-0.5 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 bg-slate-50 dark:bg-slate-900"
                  key={category.id}
                >
                  {category.name}
                </Badge>
              ))
            ) : (
              <span className="text-slate-400 dark:text-slate-600 italic text-xs">
                None
              </span>
            )}
          </div>
        </div>

        {/* MCC Code */}
        {transaction.mcc && (
          <div className="flex items-center justify-between py-3 px-4 text-sm">
            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2 font-medium">
              <Tag className="h-4 w-4 text-slate-400" /> MCC Code
            </span>
            <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
              {transaction.mcc}
            </span>
          </div>
        )}

        {/* Source */}
        <div className="flex items-center justify-between py-3 px-4 text-sm">
          <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2 font-medium">
            <Scale className="h-4 w-4 text-slate-400" /> Source
          </span>
          <div className="font-semibold text-slate-800 dark:text-slate-200">
            {getSource()}
          </div>
        </div>

        {/* Review Type */}
        <div className="flex items-center justify-between py-3 px-4 text-sm">
          <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 text-slate-400" /> Review Status
          </span>
          <div className="flex flex-wrap gap-1 justify-end">
            <ReviewReasonBadges
              reviewType={transaction.reviewType ?? undefined}
              reviewReasons={transaction.reviewReasons}
            />
          </div>
        </div>
      </div>
    </>
  );
}
