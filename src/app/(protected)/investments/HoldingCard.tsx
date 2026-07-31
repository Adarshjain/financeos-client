'use client';

import {useState} from 'react';

import {Badge} from '@/components/ui/badge';
import {Broker} from '@/lib/account.types';
import {Position} from '@/lib/types';
import {formatMoney} from '@/lib/utils';

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
  const source = pos.lastPriceSource;
  const manualOnly = isManualOnly(pos);

  return (
      <>
        <div
            onClick={() => setIsDetailOpen(true)}
            className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all space-y-2 cursor-pointer group"
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
              <div>
                {manualOnly && (
                    <Badge
                        variant="outline"
                        className="text-[8px] px-1 py-0 font-normal text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800"
                    >
                      manual price only
                    </Badge>
                )}
              </div>
              <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{pos.instrument.symbol}</div>
              <span
                  className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{pos.instrument.name || pos.instrument.symbol}</span>
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
          <div
              className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2 text-xs">
            <div className="flex flex-col text-slate-500">
              Invested
              <strong className="text-slate-700 dark:text-slate-300 font-bold tabular-nums">
                {formatMoney(pos.invested)}
              </strong>
            </div>
            <div className="flex flex-col items-center text-slate-500">
              Current
              <strong className="text-slate-700 dark:text-slate-300 font-bold tabular-nums">
                {formatMoney(pos.currentValue)}
              </strong>
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
