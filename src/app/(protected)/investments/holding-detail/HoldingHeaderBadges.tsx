'use client';

import { DollarSign, Edit, Info, Plus, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Broker } from '@/lib/account.types';
import { Position } from '@/lib/types';
import { formatDate } from '@/lib/utils';

import { CorporateActionsDialog } from '../CorporateActionsDialog';
import { CreateDividendDialog } from '../CreateDividendDialog';
import { EditPriceDialog } from '../EditPriceDialog';
import { RecordTradeDialog } from '../RecordTradeDialog';
import { parseNumber } from './HoldingSummaryMetrics';

export const isManualOnly = (pos: Position): boolean => {
  const type = pos.instrument?.type?.toLowerCase();
  if (type === 'stock' || type === 'etf') {
    return !pos.instrument.yahooSymbol;
  }
  if (type === 'mutual_fund') {
    return !pos.instrument.amfiCode;
  }
  return false;
};

export const getSourceBadge = (source?: string) => {
  if (!source) return null;
  switch (source.toUpperCase()) {
    case 'AMFI':
      return (
        <Badge className="text-2xs px-1.5 py-0 bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-0 font-bold">
          AMFI
        </Badge>
      );
    case 'YAHOO':
      return (
        <Badge className="text-2xs px-1.5 py-0 bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-0 font-bold">
          YAHOO
        </Badge>
      );
    case 'MANUAL':
      return (
        <Badge className="text-2xs px-1.5 py-0 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-0 font-bold">
          MANUAL
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-2xs px-1.5 py-0 font-bold">
          {source}
        </Badge>
      );
  }
};

interface HoldingHeaderBadgesProps {
  pos: Position;
  brokerAccounts: Broker[];
  allPositions: Position[];
  fetchHoldingTrades: () => void;
}

export function HoldingHeaderBadges({
  pos,
  brokerAccounts,
  allPositions,
  fetchHoldingTrades,
}: HoldingHeaderBadgesProps) {
  const showMergerNudge =
    isManualOnly(pos) &&
    parseNumber(pos.quantity) > 0 &&
    !pos.lastPrice &&
    !pos.mergedIntoName;

  return (
    <>
      <div className="text-xs text-slate-500 flex items-center gap-1 flex-wrap">
        <span className="text-slate-700 dark:text-slate-300 font-bold">
          {pos.brokerName}
        </span>
        <span>•</span>
        <Badge
          variant="secondary"
          className="text-2xs uppercase px-1.5 py-0 font-bold"
        >
          {pos.instrument.type}
        </Badge>
        {pos.lastPriceSource ? getSourceBadge(pos.lastPriceSource) : null}
        {parseNumber(pos.quantity) === 0 && pos.mergedIntoName && (
          <Badge
            variant="outline"
            className="text-2xs px-1.5 py-0 font-medium text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40"
          >
            ⤳ Merged into {pos.mergedIntoName}{' '}
            {pos.mergedIntoDate ? `(${formatDate(pos.mergedIntoDate)})` : ''}
          </Badge>
        )}
      </div>

      {/* Quick Actions Row */}
      <div className="flex flex-wrap items-center gap-2">
        <RecordTradeDialog
          brokerAccounts={brokerAccounts}
          initialBrokerAccountId={pos.brokerAccountId}
          initialInstrument={{ currency: 'INR', ...pos.instrument }}
          onSuccess={fetchHoldingTrades}
          trigger={
            <Button variant="outline" size="sm">
              <Plus className="w-3.5 h-3.5" />
              Record Trade
            </Button>
          }
        />
        <CreateDividendDialog
          brokerAccounts={brokerAccounts}
          positions={allPositions}
          initialBrokerAccountId={pos.brokerAccountId}
          initialInstrumentId={pos.instrument.id}
          trigger={
            <Button variant="outline" size="sm">
              <DollarSign className="w-3.5 h-3.5" />
              Add Dividend
            </Button>
          }
        />
        <EditPriceDialog
          instrument={{
            id: pos.instrument.id,
            name: pos.instrument.name,
            symbol: pos.instrument.symbol,
            lastPrice:
              pos.lastPrice != null ? String(pos.lastPrice) : undefined,
            lastPriceAsOf: pos.lastPriceAsOf ?? undefined,
          }}
          trigger={
            <Button variant="outline" size="sm">
              <Edit className="w-3.5 h-3.5" />
              Edit Manual Price
            </Button>
          }
        />
        <CorporateActionsDialog
          instrument={pos.instrument}
          heldQuantity={parseNumber(pos.quantity)}
          initialType={showMergerNudge ? 'merger' : undefined}
          trigger={
            <Button variant="outline" size="sm">
              <Zap className="w-3.5 h-3.5" />
              Corporate Actions
            </Button>
          }
        />
      </div>

      {showMergerNudge && (
        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            No live price for this holding. If the company merged or delisted,
            record a <strong className="font-semibold">Merger</strong> corporate
            action to migrate it into the surviving stock.
          </div>
        </div>
      )}
    </>
  );
}
