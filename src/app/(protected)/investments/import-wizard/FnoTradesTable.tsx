'use client';

import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FnoTradePreview } from '@/lib/types';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface FnoTradesTableProps {
  trades: FnoTradePreview[];
  fnoRowStates: Record<number, { skip: boolean }>;
  onToggleSkip: (index: number, currentSkip: boolean) => void;
}

export function FnoTradesTable({
  trades,
  fnoRowStates,
  onToggleSkip,
}: FnoTradesTableProps) {
  if (!trades || trades.length === 0) return null;

  const totalRealized = trades.reduce((acc, t, idx) => {
    const isSkipped = fnoRowStates[idx]?.skip;
    return isSkipped ? acc : acc + (t.realizedPnl || 0);
  }, 0);

  return (
    // <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-white dark:bg-slate-950 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap px-0.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">F&O Closed Trades</h3>
          <Badge variant="outline" className="text-[10px] bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            {trades.length} contract{trades.length > 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="text-xs">
          <span className="text-slate-500 mr-1">Net Realized P&L:</span>
          <span
            className={`font-bold tabular-nums ${
              totalRealized >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatCurrency(totalRealized)}
          </span>
        </div>
      {/*</div>*/}

      {/* MOBILE LIST VIEW (no horizontal scroll) */}
      <div className="block sm:hidden space-y-2 w-full">
        {trades.map((t, idx) => {
          const state = fnoRowStates[idx] || { skip: t.isDuplicate };
          const isSkipped = state.skip;

          return (
            <div
              key={`${t.externalRef || 'fno'}-${idx}`}
              className={`p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-2 text-xs transition-opacity ${
                isSkipped ? 'opacity-50 bg-slate-100/50 dark:bg-slate-900/20' : ''
              }`}
            >
              {/* Header: Checkbox + Contract Symbol & Badges */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={!isSkipped}
                    onCheckedChange={() => onToggleSkip(idx, isSkipped)}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">{t.tradingSymbol}</span>
                      <Badge variant="secondary" className="text-[9px] uppercase font-mono px-1 py-0">
                        {t.contractType}
                      </Badge>
                      {t.isDuplicate && (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0">
                          Duplicate
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {t.underlyingSymbol && `Underlying: ${t.underlyingSymbol}`}
                      {t.optionType && ` | ${t.optionType}`}
                      {t.strikePrice && ` @ ${t.strikePrice}`}
                      {t.expiryDate && ` | Exp: ${t.expiryDate}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Compact Metrics Grid */}
              <div className="grid grid-cols-4 gap-1 text-[10px] pt-0.5 tabular-nums">
                <div className="flex flex-col">
                  <span className="text-slate-400 font-semibold">Qty</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">{formatNumber(t.quantity)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400 font-semibold">Buy</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">{formatCurrency(t.buyValue)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400 font-semibold">Sell</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">{formatCurrency(t.sellValue)}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-slate-400 font-semibold">Realized P&L</span>
                  <span
                    className={`font-mono font-bold ${
                      t.realizedPnl >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {formatCurrency(t.realizedPnl)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden sm:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="text-[11px] bg-slate-50 dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900">
              <TableHead className="w-8 px-1 text-center py-1.5 h-7"></TableHead>
              <TableHead className="py-1.5 h-7">Contract</TableHead>
              <TableHead className="text-right py-1.5 h-7">Qty</TableHead>
              <TableHead className="text-right py-1.5 h-7">Buy Value</TableHead>
              <TableHead className="text-right py-1.5 h-7">Sell Value</TableHead>
              <TableHead className="text-right py-1.5 h-7">Charges</TableHead>
              <TableHead className="text-right py-1.5 h-7">Realized P&L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((t, idx) => {
              const state = fnoRowStates[idx] || { skip: t.isDuplicate };
              const isSkipped = state.skip;

              return (
                <TableRow
                  key={`${t.externalRef || 'fno'}-${idx}`}
                  className={`text-xs ${
                    isSkipped ? 'opacity-50 bg-slate-50/50 dark:bg-slate-900/30' : ''
                  }`}
                >
                  <TableCell className="text-center py-1.5 px-2">
                    <Checkbox
                      checked={!isSkipped}
                      onCheckedChange={() => onToggleSkip(idx, isSkipped)}
                    />
                  </TableCell>
                  <TableCell className="py-1.5">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{t.tradingSymbol}</span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase font-mono px-1 py-0"
                        >
                          {t.contractType}
                        </Badge>
                        {t.isDuplicate && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] px-1 py-0"
                          >
                            Duplicate
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {t.underlyingSymbol && `Underlying: ${t.underlyingSymbol}`}
                        {t.optionType && ` | ${t.optionType}`}
                        {t.strikePrice && ` @ ${t.strikePrice}`}
                        {t.expiryDate && ` | Exp: ${t.expiryDate}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono py-1.5 tabular-nums">
                    {formatNumber(t.quantity)}
                  </TableCell>
                  <TableCell className="text-right font-mono py-1.5 tabular-nums">
                    {formatCurrency(t.buyValue)}
                  </TableCell>
                  <TableCell className="text-right font-mono py-1.5 tabular-nums">
                    {formatCurrency(t.sellValue)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-400 py-1.5 tabular-nums">
                    {formatCurrency(t.totalCharges)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono font-medium py-1.5 tabular-nums ${
                      t.realizedPnl >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {formatCurrency(t.realizedPnl)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
