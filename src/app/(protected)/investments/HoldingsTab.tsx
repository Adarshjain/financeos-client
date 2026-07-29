'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Broker } from '@/lib/account.types';
import { InvestmentSummary, InvestmentTransactionResponse, Position } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

import { HoldingCard } from './HoldingCard';

interface HoldingsTabProps {
  summary: InvestmentSummary | null;
  positions: Position[];
  investmentTransactions?: InvestmentTransactionResponse[];
  brokerAccounts: Broker[];
}

const parseNumber = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined) return 0;
  return typeof val === 'string' ? parseFloat(val) : val;
};

export function HoldingsTab({
  positions,
  investmentTransactions = [],
  brokerAccounts,
}: HoldingsTabProps) {
  const [holdingSearch, setHoldingSearch] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState<string>('all');
  const [selectedBrokerFilter, setSelectedBrokerFilter] = useState<string>('all');

  const filteredPositions = useMemo(() => {
    return positions.filter((pos) => {
      const matchSearch =
        !holdingSearch ||
        pos.instrument.name.toLowerCase().includes(holdingSearch.toLowerCase()) ||
        (pos.instrument.symbol && pos.instrument.symbol.toLowerCase().includes(holdingSearch.toLowerCase()));

      const matchType =
        selectedAssetType === 'all' || pos.instrument.type?.toLowerCase() === selectedAssetType.toLowerCase();

      const matchBroker = selectedBrokerFilter === 'all' || pos.brokerAccountId === selectedBrokerFilter;

      return matchSearch && matchType && matchBroker;
    });
  }, [positions, holdingSearch, selectedAssetType, selectedBrokerFilter]);

  const filteredSummary = useMemo(() => {
    let invested = 0;
    let currentValue = 0;
    let pnl = 0;

    for (const pos of filteredPositions) {
      invested += parseNumber(pos.invested);
      currentValue += parseNumber(pos.currentValue);
      pnl += parseNumber(pos.unrealizedGainLoss) + parseNumber(pos.realizedGainLoss);
    }

    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

    return {
      invested,
      currentValue,
      pnl,
      pnlPct,
    };
  }, [filteredPositions]);

  return (
    <div className="space-y-2">
      {/* 1. Zerodha Filters Bar (Reordered First) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 pb-1">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search holdings by symbol or name..."
            value={holdingSearch}
            onChange={(e) => setHoldingSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedAssetType} onValueChange={setSelectedAssetType}>
            <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold w-[130px]">
              <SelectValue placeholder="Asset Type" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
              <SelectItem value="all" className="text-xs">
                All Assets
              </SelectItem>
              <SelectItem value="stock" className="text-xs">
                Equity / Stocks
              </SelectItem>
              <SelectItem value="mutual_fund" className="text-xs">
                Mutual Funds
              </SelectItem>
              <SelectItem value="etf" className="text-xs">
                ETFs
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedBrokerFilter} onValueChange={setSelectedBrokerFilter}>
            <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold w-[140px]">
              <SelectValue placeholder="Broker Account" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
              <SelectItem value="all" className="text-xs">
                All Brokers
              </SelectItem>
              {brokerAccounts.map((b) => (
                <SelectItem key={b.id} value={b.id} className="text-xs">
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 2. Holdings Overview Top Card (Recalculated from filteredPositions) */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Invested
              </div>
              <div className="text-xl sm:text-2xl font-black tabular-nums tracking-tight mt-0.5 text-slate-900 dark:text-white">
                {formatMoney(filteredSummary.invested)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Current Value
              </div>
              <div className="text-xl sm:text-2xl font-black tabular-nums tracking-tight mt-0.5 text-slate-900 dark:text-white">
                {formatMoney(filteredSummary.currentValue)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Total P&L</span>
            <div className="flex items-center gap-2">
              <span
                className={`text-xl sm:text-2xl font-black tabular-nums ${
                  filteredSummary.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {filteredSummary.pnl >= 0 ? '+' : ''}
                {formatMoney(filteredSummary.pnl)}
              </span>
              <Badge
                className={`text-xs font-black px-2 py-0.5 border-0 ${
                  filteredSummary.pnl >= 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                }`}
              >
                {filteredSummary.pnl >= 0 ? '+' : ''}
                {filteredSummary.pnlPct.toFixed(2)}%
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Holdings Items List */}
      {filteredPositions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          No holdings found matching filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPositions.map((pos) => {
            const holdingTrades = investmentTransactions
              .filter(
                (tx) => tx.brokerAccountId === pos.brokerAccountId && tx.instrumentId === pos.instrument.id,
              )
              .sort((a, b) => new Date(b.tradeDate).getTime() - new Date(a.tradeDate).getTime());

            return (
              <HoldingCard
                key={pos.holdingId || `${pos.brokerAccountId}-${pos.instrument.id}`}
                pos={pos}
                holdingTrades={holdingTrades}
                brokerAccounts={brokerAccounts}
                allPositions={positions}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
