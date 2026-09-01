'use client';

import { ArrowUpDown, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Broker } from '@/lib/account.types';
import { FnoTradeResponse } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

import { EditFnoTradeDialog } from '../EditFnoTradeDialog';

interface FnoDesktopTableProps {
  trades: FnoTradeResponse[];
  brokerAccounts: Broker[];
  onRefresh: () => void;
  onSelectDeleteTrade: (trade: FnoTradeResponse) => void;
  getBrokerName: (trade: FnoTradeResponse) => string;
  onToggleSort: (
    field: 'exitDate' | 'tradingSymbol' | 'realizedPnl' | 'buyValue'
  ) => void;
}

export function FnoDesktopTable({
  trades,
  brokerAccounts,
  onRefresh,
  onSelectDeleteTrade,
  getBrokerName,
  onToggleSort,
}: FnoDesktopTableProps) {
  return (
    <div className="hidden md:block">
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  <button
                    onClick={() => onToggleSort('tradingSymbol')}
                    className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white"
                  >
                    Symbol & Contract
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Broker
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Strike
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  <button
                    onClick={() => onToggleSort('exitDate')}
                    className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white"
                  >
                    Exit Date
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300 text-right">
                  Quantity
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300 text-right">
                  Buy / Sell Value
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300 text-right">
                  Charges
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300 text-right">
                  <button
                    onClick={() => onToggleSort('realizedPnl')}
                    className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white ml-auto"
                  >
                    Realized P&L
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300 text-center">
                  Source
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => {
                const pnl = Number(trade.realizedPnl || 0);
                const isProfit = pnl >= 0;

                return (
                  <TableRow
                    key={trade.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            {trade.tradingSymbol}
                          </div>
                          {trade.underlyingSymbol && (
                            <div className="text-2xs text-slate-400 font-medium">
                              Underlying: {trade.underlyingSymbol}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1">
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
                      </div>
                    </TableCell>

                    <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {getBrokerName(trade)}
                    </TableCell>

                    <TableCell className="py-2.5 text-xs">
                      {trade.contractType === 'option' || trade.strikePrice ? (
                        <div>
                          {trade.strikePrice && (
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              ₹{Number(trade.strikePrice).toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </TableCell>

                    <TableCell className="py-2.5 text-xs">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">
                        {trade.exitDate ? formatDate(trade.exitDate) : '—'}
                      </div>
                      {trade.entryDate && (
                        <div className="text-2xs text-slate-400">
                          Entry: {formatDate(trade.entryDate)}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="py-2.5 text-xs text-right font-semibold text-slate-900 dark:text-white">
                      {Number(trade.quantity).toLocaleString('en-IN')}
                    </TableCell>

                    <TableCell className="py-2.5 text-xs text-right">
                      <div className="text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                        Sell: {formatMoney(Number(trade.sellValue))}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-xs">
                        Buy: {formatMoney(Number(trade.buyValue))}
                      </div>
                    </TableCell>

                    <TableCell className="py-2.5 text-xs text-right text-slate-500 font-medium">
                      {formatMoney(Number(trade.totalCharges || 0))}
                    </TableCell>

                    <TableCell className="py-2.5 text-xs text-right font-extrabold">
                      <span
                        className={
                          isProfit
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {isProfit ? '+' : ''}
                        {formatMoney(pnl)}
                      </span>
                    </TableCell>

                    <TableCell className="py-2.5 text-center">
                      <Badge
                        variant="outline"
                        className="text-2xs capitalize rounded-lg border-slate-200 dark:border-slate-800 text-slate-500"
                      >
                        {trade.source || 'manual'}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <EditFnoTradeDialog
                          trade={trade}
                          brokerAccounts={brokerAccounts}
                          onSuccess={onRefresh}
                        />
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => onSelectDeleteTrade(trade)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
