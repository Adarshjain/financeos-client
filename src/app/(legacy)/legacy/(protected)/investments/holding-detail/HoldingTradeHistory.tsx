'use client';

import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Broker } from '@/lib/account.types';
import { InvestmentTransactionResponse } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

import { EditTransactionDialog } from '../EditTransactionDialog';
import { parseNumber } from './HoldingSummaryMetrics';

interface HoldingTradeHistoryProps {
  holdingTrades: InvestmentTransactionResponse[];
  isLoadingTrades: boolean;
  brokerAccounts: Broker[];
  onSuccess: () => void;
}

export function HoldingTradeHistory({
  holdingTrades,
  isLoadingTrades,
  brokerAccounts,
  onSuccess,
}: HoldingTradeHistoryProps) {
  if (isLoadingTrades && holdingTrades.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading trades...
      </div>
    );
  }

  if (holdingTrades.length === 0) {
    return (
      <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200/60 dark:border-slate-800 text-xs text-slate-400 italic">
        No trades recorded for this holding yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
      {holdingTrades.map((tx) => {
        const isBuy = tx.type === 'buy';
        const totalAmt = parseNumber(tx.quantity) * parseNumber(tx.price);

        return (
          <div
            key={tx.id}
            className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 text-xs"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Badge
                  className={`text-2xs uppercase px-1.5 py-0 font-extrabold border-0 ${
                    isBuy
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {tx.type}
                </Badge>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {tx.quantity} units @ {formatMoney(tx.price)}
                </span>
              </div>
              <div className="text-2xs text-slate-400 flex items-center gap-1">
                <span>{formatDate(tx.tradeDate)}</span>
                <span>•</span>
                <span>{tx.brokerName}</span>
                {tx.notes && (
                  <>
                    <span>•</span>
                    <span className="italic truncate max-w-[150px]">
                      {tx.notes}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {formatMoney(totalAmt)}
                </div>
                {tx.totalCharges && parseNumber(tx.totalCharges) > 0 && (
                  <div className="text-2xs text-slate-400">
                    Charges: {formatMoney(tx.totalCharges)}
                  </div>
                )}
              </div>

              <EditTransactionDialog
                transaction={tx}
                brokerAccounts={brokerAccounts}
                onSuccess={onSuccess}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
