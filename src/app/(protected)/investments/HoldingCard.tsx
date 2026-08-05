'use client';

import {useState} from 'react';

import {Badge} from '@/components/ui/badge';
import {Broker} from '@/lib/account.types';
import {Position} from '@/lib/types';
import {formatDate, formatMoney} from '@/lib/utils';

import {HoldingDetailDialog} from './HoldingDetailDialog';

interface HoldingCardProps {
  pos: Position;
  brokerAccounts: Broker[];
  allPositions: Position[];
}

const parseNumber = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined) return 0;
  return typeof val === 'string' ? parseFloat(val) : val;
};

const isManualOnly = (pos: Position): boolean => {
  const type = pos.instrument?.type?.toLowerCase();
  if (type === 'stock' || type === 'etf') {
    return !pos.instrument.yahooSymbol;
  }
  if (type === 'mutual_fund') {
    return !pos.instrument.amfiCode;
  }
  return false;
};

export function HoldingCard({pos, brokerAccounts, allPositions}: HoldingCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const unrl = parseNumber(pos.unrealizedGainLoss);
  const unrlPct = pos.unrealizedGainLossPercent ? parseNumber(pos.unrealizedGainLossPercent) : 0;
  const manualOnly = isManualOnly(pos);

  const isFno = pos.instrument.type === 'future' || pos.instrument.type === 'option';
  const realizedPnl = parseNumber(pos.realizedGainLoss);
  const absReturn = pos.absoluteReturnPercent ? parseNumber(pos.absoluteReturnPercent) : 0;

  if (isFno) {
    return (
      <>
        <div
          onClick={() => setIsDetailOpen(true)}
          className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all space-y-2 cursor-pointer group"
        >
          {/* Row 1: Top Metadata */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[9px] uppercase px-1.5 py-0 font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
                {pos.instrument.type}
              </Badge>
              {pos.unclosed ? (
                <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 font-bold text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/50">
                  Unclosed (Net {pos.netQty || pos.quantity})
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 font-bold text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/50">
                  Closed Position
                </Badge>
              )}
              {pos.instrument.optionType && (
                <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 font-bold text-blue-600 border-blue-300">
                  {pos.instrument.optionType} {pos.instrument.strikePrice ? `@ ${pos.instrument.strikePrice}` : ''}
                </Badge>
              )}
            </div>
            <div className={`font-bold tabular-nums ${realizedPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {absReturn >= 0 ? '+' : ''}{absReturn.toFixed(2)}%
            </div>
          </div>

          {/* Row 2: Symbol & Realized P&L */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {pos.instrument.tradingSymbol || pos.instrument.symbol || pos.instrument.name}
              </span>
              <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                Underlying: {pos.instrument.underlyingSymbol || pos.instrument.name}
                {pos.instrument.expiryDate ? ` • Expiry: ${formatDate(pos.instrument.expiryDate)}` : ''}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase font-bold text-slate-400">Realized P&L</div>
              <div className={`text-base font-black tabular-nums ${realizedPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {realizedPnl >= 0 ? '+' : ''}{formatMoney(pos.realizedGainLoss)}
              </div>
            </div>
          </div>

          {/* Row 3: Buy Value | Sell Value | Charges */}
          <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex flex-col text-slate-500">
              Buy Value
              <strong className="text-slate-700 dark:text-slate-300 font-bold tabular-nums">
                {formatMoney(pos.buyValue || parseNumber(pos.avgCost) * parseNumber(pos.quantity))}
              </strong>
            </div>
            <div className="flex flex-col items-center text-slate-500">
              Sell Value
              <strong className="text-slate-700 dark:text-slate-300 font-bold tabular-nums">
                {formatMoney(pos.sellValue || '0')}
              </strong>
            </div>
            <div className="flex flex-col items-end text-slate-500">
              Charges
              <strong className="text-slate-700 dark:text-slate-300 font-bold tabular-nums">
                {formatMoney(pos.totalCharges)}
              </strong>
            </div>
          </div>
        </div>

        <HoldingDetailDialog
          pos={pos}
          brokerAccounts={brokerAccounts}
          allPositions={allPositions}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
        />
      </>
    );
  }

  return (
      <>
        <div
            onClick={() => setIsDetailOpen(true)}
            className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all space-y-1 cursor-pointer group"
        >
          {/* Row 1: Top Metadata (Qty & Avg Cost Left | P&L % Right) */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-1">
            <span>
              Qty. <strong className="text-slate-800 dark:text-slate-200 font-bold">{pos.quantity}</strong>
            </span>
              <span>•</span>
              <span>
              Avg. <strong className="text-slate-800 dark:text-slate-200 font-bold">{formatMoney(pos.avgCost)}</strong>
            </span>
              <span>•</span>
              <Badge variant="secondary" className="text-[9px] uppercase px-1.5 py-0 font-bold">
                {pos.instrument.type}
              </Badge>
            </div>
            <div
                className={`font-bold tabular-nums ${
                    unrlPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
            >
              {unrlPct >= 0 ? '+' : ''}
              {pos.unrealizedGainLossPercent}%
            </div>
          </div>

          {/* Row 2: Middle Main Row (Symbol/Name Left | Total P&L Right) */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1 flex-wrap">
                {manualOnly && (
                    <Badge
                        variant="outline"
                        className="text-[8px] px-1 py-0 font-normal text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800"
                    >
                      manual price only
                    </Badge>
                )}
                {parseNumber(pos.quantity) === 0 && pos.mergedIntoName && (
                    <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 font-medium text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40"
                    >
                      ⤳ Merged into {pos.mergedIntoName} {pos.mergedIntoDate ? `(${formatDate(pos.mergedIntoDate)})` : ''}
                    </Badge>
                )}
              </div>
              <span
                  className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{pos.instrument.symbol || pos.instrument.name}</span>
              <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{pos.instrument.name}</div>
            </div>

            <div className="text-right shrink-0">
              <div
                  className={`text-base font-black tabular-nums ${
                      unrl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
              >
                {unrl >= 0 ? '+' : ''}
                {formatMoney(pos.unrealizedGainLoss)}
              </div>
            </div>
          </div>

          {/* Row 3: Bottom Row (Invested Left | LTP, As-Of & Source Right) */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex flex-col text-slate-500">
              Invested
              <strong className="text-slate-700 dark:text-slate-300 font-bold tabular-nums">
                {formatMoney(pos.invested)}
              </strong>
            </div>
            <div className="flex flex-col items-center text-slate-500">
              Current
              <div className="flex items-center gap-1">
                <strong className="text-slate-700 dark:text-slate-300 font-bold tabular-nums">
                  {formatMoney(pos.currentValue)}
                </strong>
                {parseNumber(pos.quantity) > 0 && !pos.lastPrice && pos.currentValue && (
                  <Badge
                    variant="outline"
                    className="text-[8px] px-1 py-0 font-normal text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30"
                  >
                    at cost
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end text-slate-500">
              LTP
              <strong className="text-slate-700 dark:text-slate-300 font-bold tabular-nums">
                {formatMoney(pos.lastPrice)}
              </strong>
            </div>
          </div>
        </div>

        <HoldingDetailDialog
            pos={pos}
            brokerAccounts={brokerAccounts}
            allPositions={allPositions}
            open={isDetailOpen}
            onOpenChange={setIsDetailOpen}
        />
      </>
  );
}
