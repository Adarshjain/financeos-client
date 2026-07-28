'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Broker } from '@/lib/account.types';
import { InvestmentSummary, Position } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

import { HoldingCard } from './HoldingCard';

interface HoldingsTabProps {
  summary: InvestmentSummary | null;
  positions: Position[];
  brokerAccounts: Broker[];
}

const parseNumber = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined) return 0;
  return typeof val === 'string' ? parseFloat(val) : val;
};

export function HoldingsTab({ summary, positions, brokerAccounts }: HoldingsTabProps) {
  const [holdingSearch, setHoldingSearch] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState<string>('all');
  const [selectedBrokerFilter, setSelectedBrokerFilter] = useState<string>('all');

  const totalPnlNum = parseNumber(summary?.totalPnl);

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

  return (
    <div className="space-y-2">
      {/* Holdings Overview Top Card */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Invested
              </div>
              <div className="text-xl sm:text-2xl font-black tabular-nums tracking-tight mt-0.5 text-slate-900 dark:text-white">
                {formatMoney(summary?.totalInvested)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Current Value
              </div>
              <div className="text-xl sm:text-2xl font-black tabular-nums tracking-tight mt-0.5 text-slate-900 dark:text-white">
                {formatMoney(summary?.totalCurrentValue)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Total P&L</span>
            <div className="flex items-center gap-2">
              <span
                className={`text-xl sm:text-2xl font-black tabular-nums ${
                  totalPnlNum >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {totalPnlNum >= 0 ? '+' : ''}
                {formatMoney(summary?.totalPnl)}
              </span>
              {summary?.totalUnrealizedPercent && (
                <Badge
                  className={`text-xs font-black px-2 py-0.5 border-0 ${
                    totalPnlNum >= 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                  }`}
                >
                  {totalPnlNum >= 0 ? '+' : ''}
                  {summary.totalUnrealizedPercent}%
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Zerodha Filters Bar */}
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

      {/* Holdings Items List */}
      {filteredPositions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          No holdings found matching filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPositions.map((pos) => (
            <HoldingCard key={pos.holdingId || `${pos.brokerAccountId}-${pos.instrument.id}`} pos={pos} />
          ))}
        </div>
      )}
    </div>
  );
}
