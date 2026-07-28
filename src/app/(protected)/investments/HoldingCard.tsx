'use client';

import { Edit, LineChart, MoreVertical, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Position } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

import { CorporateActionsDialog } from './CorporateActionsDialog';
import { EditPriceDialog } from './EditPriceDialog';
import { PriceHistoryDialog } from './PriceHistoryDialog';

interface HoldingCardProps {
  pos: Position;
}

const parseNumber = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined) return 0;
  return typeof val === 'string' ? parseFloat(val) : val;
};

const getSourceBadge = (source?: string) => {
  if (!source) return null;
  switch (source.toUpperCase()) {
    case 'AMFI':
      return (
        <Badge className="text-[8px] px-1 py-0 bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-0 font-bold">
          AMFI
        </Badge>
      );
    case 'YAHOO':
      return (
        <Badge className="text-[8px] px-1 py-0 bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-0 font-bold">
          YAHOO
        </Badge>
      );
    case 'MANUAL':
      return (
        <Badge className="text-[8px] px-1 py-0 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-0 font-bold">
          MANUAL
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-[8px] px-1 py-0 font-bold">
          {source}
        </Badge>
      );
  }
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

export function HoldingCard({ pos }: HoldingCardProps) {
  const unrl = parseNumber(pos.unrealizedGainLoss);
  const unrlPct = pos.unrealizedGainLossPercent ? parseNumber(pos.unrealizedGainLossPercent) : 0;
  const source = pos.lastPriceSource;
  const manualOnly = isManualOnly(pos);

  return (
    <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all space-y-2">
      {/* Row 1: Top Metadata (Qty & Avg Cost Left | P&L % Right) */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
        <div className="flex items-center gap-1.5">
          <span>
            Qty. <strong className="text-slate-800 dark:text-slate-200 font-bold">{pos.quantity}</strong>
          </span>
          <span>•</span>
          <span>
            Avg. <strong className="text-slate-800 dark:text-slate-200 font-bold">{formatMoney(pos.avgCost)}</strong>
          </span>
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
          <div className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>{pos.instrument.symbol || pos.instrument.name}</span>
            <Badge variant="secondary" className="text-[9px] uppercase px-1.5 py-0 font-bold">
              {pos.instrument.type}
            </Badge>
            {manualOnly && (
              <Badge
                variant="outline"
                className="text-[8px] px-1 py-0 font-normal text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800"
              >
                manual price only
              </Badge>
            )}
          </div>
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

      {/* Row 3: Bottom Row (Invested Left | LTP, As-Of & 3-Dot Actions Right) */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">
            Invested{' '}
            <strong className="text-slate-700 dark:text-slate-300 font-bold tabular-nums">
              {formatMoney(pos.invested)}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium tabular-nums">
          <span>
            Current Val:{' '}
            <strong className="text-slate-900 dark:text-white font-bold">{formatMoney(pos.currentValue)}</strong>
          </span>
          <span>•</span>
          <span>
            LTP <strong className="text-slate-900 dark:text-white font-bold">{formatMoney(pos.lastPrice)}</strong>
          </span>
          {getSourceBadge(source)}

          {/* Three-Dot Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md"
              >
                <MoreVertical className="w-4 h-4" />
                <span className="sr-only">Holding Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 p-1"
            >
              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Holding Options
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <div className="space-y-0.5">
                <PriceHistoryDialog
                  instrument={{ ...pos.instrument, lastPrice: pos.lastPrice }}
                  trigger={
                    <button
                      type="button"
                      className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded flex items-center gap-2 transition-colors"
                    >
                      <LineChart className="w-3.5 h-3.5 text-blue-500" />
                      <span>Price History</span>
                    </button>
                  }
                />

                <CorporateActionsDialog
                  instrument={pos.instrument}
                  trigger={
                    <button
                      type="button"
                      className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded flex items-center gap-2 transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Corporate Actions</span>
                    </button>
                  }
                />

                <EditPriceDialog
                  instrument={{
                    ...pos.instrument,
                    lastPrice: pos.lastPrice,
                    lastPriceAsOf: pos.lastPriceAsOf,
                  }}
                  trigger={
                    <button
                      type="button"
                      className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded flex items-center gap-2 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Edit Manual Price</span>
                    </button>
                  }
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
