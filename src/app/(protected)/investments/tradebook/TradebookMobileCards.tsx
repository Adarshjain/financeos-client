'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Account, Broker } from '@/lib/account.types';
import { InvestmentTransactionResponse } from '@/lib/types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

import { EditTransactionDialog } from '../EditTransactionDialog';

export function getTypeBadge(type: string | undefined) {
  switch (type?.toLowerCase()) {
    case 'buy':
      return (
        <Badge
          variant="outline"
          className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-bold text-2xs uppercase px-2 py-0.5"
        >
          BUY
        </Badge>
      );
    case 'sell':
      return (
        <Badge
          variant="outline"
          className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-bold text-2xs uppercase px-2 py-0.5"
        >
          SELL
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="font-bold text-2xs uppercase px-2 py-0.5"
        >
          {type?.toUpperCase() || 'TRADE'}
        </Badge>
      );
  }
}

export function getSettlementBadge(settlementType: string | undefined) {
  if (settlementType?.toLowerCase() === 'intraday') {
    return (
      <Badge
        variant="outline"
        className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-bold text-2xs uppercase px-1.5 py-0"
        title="Intraday (MIS)"
      >
        MIS
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800 font-bold text-2xs uppercase px-1.5 py-0"
      title="Delivery (CNC)"
    >
      CNC
    </Badge>
  );
}

export function getBrokerName(
  tx: InvestmentTransactionResponse,
  accounts: Account[],
  brokerAccounts: Broker[]
) {
  const acc =
    accounts.find((a) => a.id === tx.brokerAccountId) ||
    brokerAccounts.find((a) => a.id === tx.brokerAccountId);
  return acc?.name || tx.brokerName || '—';
}

export function getInstrumentDisplayName(tx: InvestmentTransactionResponse) {
  const name = tx.instrument.name;
  const symbol = tx.instrument.symbol;
  if (name && symbol) return `${name} (${symbol})`;
  return name || symbol || 'Instrument';
}

interface TradebookMobileCardsProps {
  transactions: InvestmentTransactionResponse[];
  brokerAccounts: Broker[];
  accounts: Account[];
  isLoading: boolean;
  onSuccess: () => void;
}

export function TradebookMobileCards({
  transactions,
  brokerAccounts,
  accounts,
  isLoading,
  onSuccess,
}: TradebookMobileCardsProps) {
  return (
    <div
      className={cn(
        'block md:hidden space-y-2',
        isLoading && 'opacity-60 transition-opacity'
      )}
    >
      {transactions.map((tx) => (
        <Card
          key={tx.id}
          className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-900/60 transition-all duration-200 overflow-hidden flex flex-col justify-between"
        >
          {/* Header Row */}
          <CardHeader className="p-3 sm:p-3.5 flex flex-row items-center justify-between border-0 space-y-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                {formatDate(tx.tradeDate)}
              </span>
              {getTypeBadge(tx.type)}
              {getSettlementBadge(tx.settlementType)}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <EditTransactionDialog
                transaction={tx}
                brokerAccounts={brokerAccounts}
                onSuccess={onSuccess}
              />
            </div>
          </CardHeader>

          <CardContent className="p-3 sm:p-3.5 space-y-1 flex-1 flex flex-col justify-between pt-0">
            {/* Instrument & Broker Info */}
            <div className="space-y-1">
              <div
                className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate"
                title={getInstrumentDisplayName(tx)}
              >
                {getInstrumentDisplayName(tx)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {getBrokerName(tx, accounts, brokerAccounts)}
              </div>
            </div>

            {/* Qty & Price Footer */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Qty:{' '}
                <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                  {tx.quantity}
                </span>
              </span>
              <div className="text-right">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatMoney(tx.price)}
                </span>
                <span className="text-2xs text-slate-400 tabular-nums ml-1">
                  / unit
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
