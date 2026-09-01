'use client';

import { Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Broker } from '@/lib/account.types';
import { FnoTradeResponse } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

import { EditFnoTradeDialog } from '../EditFnoTradeDialog';

interface FnoMobileCardsProps {
  trades: FnoTradeResponse[];
  brokerAccounts: Broker[];
  onRefresh: () => void;
  onSelectDeleteTrade: (trade: FnoTradeResponse) => void;
  getBrokerName: (trade: FnoTradeResponse) => string;
}

export function FnoMobileCards({
  trades,
  brokerAccounts,
  onRefresh,
  onSelectDeleteTrade,
  getBrokerName,
}: FnoMobileCardsProps) {
  return (
    <div className="block md:hidden space-y-2">
      {trades.map((trade) => {
        const pnl = Number(trade.realizedPnl || 0);
        const isProfit = pnl >= 0;

        return (
          <div
            key={trade.id}
            className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5"
          >
            {/* Top Row: Symbol & Badges Left | P&L Right */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                    {trade.tradingSymbol}
                  </span>
                  {trade.contractType === 'future' ? (
                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-extrabold text-2xs border-0 px-1.5 py-0">
                      FUT
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-extrabold text-2xs border-0 px-1.5 py-0">
                      OPT
                    </Badge>
                  )}
                  {trade.optionType && (
                    <Badge
                      className={`font-extrabold text-2xs border-0 px-1.5 py-0 ${
                        trade.optionType === 'CE'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {trade.optionType}
                    </Badge>
                  )}
                </div>
                <div className="text-2xs text-slate-400 font-medium mt-0.5">
                  {getBrokerName(trade)} • Qty:{' '}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {Number(trade.quantity).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div
                  className={`text-sm font-black tabular-nums ${
                    isProfit
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {isProfit ? '+' : ''}
                  {formatMoney(pnl)}
                </div>
              </div>
            </div>

            {/* Middle Row: Values & Details */}
            <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
              <div>
                <span className="text-slate-400 text-2xs block">Buy Value</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatMoney(Number(trade.buyValue))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-2xs block">Sell Value</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatMoney(Number(trade.sellValue))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-2xs block">Charges</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatMoney(Number(trade.totalCharges || 0))}
                </span>
              </div>
            </div>

            {/* Bottom Row: Dates & Actions */}
            <div className="flex items-center justify-between text-2xs text-slate-400 pt-0.5">
              <div>
                Exit:{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {trade.exitDate ? formatDate(trade.exitDate) : '—'}
                </span>
                {trade.strikePrice && (
                  <span className="ml-1.5">
                    • Strike: ₹{Number(trade.strikePrice).toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <EditFnoTradeDialog
                  trade={trade}
                  brokerAccounts={brokerAccounts}
                  onSuccess={onRefresh}
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onSelectDeleteTrade(trade)}
                  className="text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
