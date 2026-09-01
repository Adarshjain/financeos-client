'use client';

import React from 'react';

import { StatementCardDetails } from '@/lib/statement.types';
import { formatDate, formatNullableMoney } from '@/lib/utils';

interface StatementCreditCardSummaryProps {
  cardDetails: StatementCardDetails;
}

export function StatementCreditCardSummary({
  cardDetails,
}: StatementCreditCardSummaryProps) {
  return (
    <div className="space-y-2 w-full min-w-0">
      <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
        Credit Card Summary
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 text-xs w-full min-w-0">
        <div className="min-w-0">
          <span className="text-slate-400 block text-xs truncate">
            Total Due
          </span>
          <span className="font-bold tabular-nums text-slate-900 dark:text-white truncate block">
            {formatNullableMoney(cardDetails.totalAmountDue)}
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-slate-400 block text-xs truncate">
            Min Due
          </span>
          <span className="font-bold tabular-nums text-slate-900 dark:text-white truncate block">
            {formatNullableMoney(cardDetails.minimumAmountDue)}
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-slate-400 block text-xs truncate">
            Due Date
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
            {cardDetails.paymentDueDate
              ? formatDate(cardDetails.paymentDueDate)
              : '—'}
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-slate-400 block text-xs truncate">
            Credit Limit
          </span>
          <span className="font-bold tabular-nums text-slate-900 dark:text-white truncate block">
            {formatNullableMoney(cardDetails.creditLimit)}
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-slate-400 block text-xs truncate">
            Available Credit
          </span>
          <span className="font-bold tabular-nums text-slate-900 dark:text-white truncate block">
            {formatNullableMoney(cardDetails.availableCreditLimit)}
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-slate-400 block text-xs truncate">
            Finance Charges
          </span>
          <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400 truncate block">
            {formatNullableMoney(cardDetails.financeCharges)}
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-slate-400 block text-xs truncate">
            Fees & Charges
          </span>
          <span className="font-bold tabular-nums text-slate-900 dark:text-white truncate block">
            {formatNullableMoney(cardDetails.feesAndCharges)}
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-slate-400 block text-xs truncate">
            Previous Balance
          </span>
          <span className="font-bold tabular-nums text-slate-900 dark:text-white truncate block">
            {formatNullableMoney(cardDetails.previousBalance)}
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-slate-400 block text-xs truncate">
            Payments Received
          </span>
          <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400 truncate block">
            {formatNullableMoney(cardDetails.paymentsReceived)}
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-slate-400 block text-xs truncate">
            Total Purchases
          </span>
          <span className="font-bold tabular-nums text-slate-900 dark:text-white truncate block">
            {formatNullableMoney(cardDetails.totalPurchases)}
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-slate-400 block text-xs truncate">
            Reward Points Bal.
          </span>
          <span className="font-bold tabular-nums text-amber-600 dark:text-amber-400 truncate block">
            {cardDetails.rewardPointsBalance !== null
              ? cardDetails.rewardPointsBalance.toLocaleString()
              : '—'}
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-slate-400 block text-xs truncate">
            Points Earned
          </span>
          <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400 truncate block">
            {cardDetails.rewardPointsEarned !== null
              ? `+${cardDetails.rewardPointsEarned.toLocaleString()}`
              : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
