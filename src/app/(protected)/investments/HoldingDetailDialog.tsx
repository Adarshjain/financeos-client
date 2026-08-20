'use client';

import {DollarSign, Edit, Info, Loader2, Plus, Zap} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';

import {listInvestmentTransactions} from '@/actions/investments';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle,} from '@/components/ui/dialog';
import {Broker} from '@/lib/account.types';
import {InvestmentTransactionResponse, Position} from '@/lib/types';
import {formatDate, formatMoney} from '@/lib/utils';

import {CorporateActionsDialog} from './CorporateActionsDialog';
import {CreateDividendDialog} from './CreateDividendDialog';
import {EditPriceDialog} from './EditPriceDialog';
import {EditTransactionDialog} from './EditTransactionDialog';
import {PriceHistoryPanel} from './PriceHistoryPanel';
import {RecordTradeDialog} from './RecordTradeDialog';

const HOLDING_TRADES_PAGE_SIZE = 500;

interface HoldingDetailDialogProps {
  pos: Position;
  brokerAccounts: Broker[];
  allPositions: Position[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MetricItemProps {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  valueClassName?: string;
}

function MetricItem({label, value, subValue, valueClassName}: MetricItemProps) {
  return (
      <div className="p-1">
        <div className="text-2xs font-bold uppercase tracking-wider text-slate-400">{label}</div>
        <div
            className={`text-base font-extrabold tabular-nums mt-0.5 ${valueClassName || 'text-slate-900 dark:text-white'}`}>
          {value}
        </div>
        {subValue && <div className="mt-0.5">{subValue}</div>}
      </div>
  );
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

const getSourceBadge = (source?: string) => {
  if (!source) return null;
  switch (source.toUpperCase()) {
    case 'AMFI':
      return (
          <Badge
              className="text-2xs px-1.5 py-0 bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-0 font-bold">
            AMFI
          </Badge>
      );
    case 'YAHOO':
      return (
          <Badge
              className="text-2xs px-1.5 py-0 bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-0 font-bold">
            YAHOO
          </Badge>
      );
    case 'MANUAL':
      return (
          <Badge
              className="text-2xs px-1.5 py-0 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-0 font-bold">
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

export function HoldingDetailDialog({
                                      pos,
                                      brokerAccounts,
                                      allPositions,
                                      open,
                                      onOpenChange,
                                    }: HoldingDetailDialogProps) {
  const unrl = parseNumber(pos.unrealizedGainLoss);
  const unrlPct = pos.unrealizedGainLossPercent ? parseNumber(pos.unrealizedGainLossPercent) : 0;
  const rlz = parseNumber(pos.realizedGainLoss);
  const showMergerNudge = isManualOnly(pos) && parseNumber(pos.quantity) > 0 && !pos.lastPrice && !pos.mergedIntoName;

  const [holdingTrades, setHoldingTrades] = useState<InvestmentTransactionResponse[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);

  const fetchHoldingTrades = useCallback(async () => {
    setIsLoadingTrades(true);
    try {
      const filters = pos.holdingId
          ? {holdingId: pos.holdingId}
          : {brokerAccountId: pos.brokerAccountId, instrumentId: pos.instrument.id};
      const res = await listInvestmentTransactions(0, HOLDING_TRADES_PAGE_SIZE, filters);
      if (res.success) {
        const rows = [...(res.data.content || [])].sort(
            (a, b) => new Date(b.tradeDate).getTime() - new Date(a.tradeDate).getTime(),
        );
        setHoldingTrades(rows);
      }
    } finally {
      setIsLoadingTrades(false);
    }
  }, [pos.holdingId, pos.brokerAccountId, pos.instrument.id]);

  useEffect(() => {
    if (open) fetchHoldingTrades();
  }, [open, fetchHoldingTrades]);

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div
                className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{pos.instrument.name}</span>
                {pos.instrument.symbol && (
                    <span className="text-xs font-semibold text-slate-400">({pos.instrument.symbol})</span>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 flex items-center gap-2 mt-1">
              </DialogDescription>
            </div>
          </DialogHeader>

          <DialogBody className="space-y-3">
            <div className="text-xs text-slate-500 flex items-center gap-1 flex-wrap">
              <span className="text-slate-700 dark:text-slate-300 font-bold">{pos.brokerName}</span>
              <span>•</span>
              <Badge variant="secondary" className="text-2xs uppercase px-1.5 py-0 font-bold">
                {pos.instrument.type}
              </Badge>
              {getSourceBadge(pos.lastPriceSource)}
              {parseNumber(pos.quantity) === 0 && pos.mergedIntoName && (
                  <Badge
                      variant="outline"
                      className="text-2xs px-1.5 py-0 font-medium text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40"
                  >
                    ⤳ Merged into {pos.mergedIntoName} {pos.mergedIntoDate ? `(${formatDate(pos.mergedIntoDate)})` : ''}
                  </Badge>
              )}
            </div>
            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center gap-2">
              <RecordTradeDialog
                  brokerAccounts={brokerAccounts}
                  initialBrokerAccountId={pos.brokerAccountId}
                  initialInstrument={{currency: 'INR', ...pos.instrument}}
                  onSuccess={fetchHoldingTrades}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Plus className="w-3.5 h-3.5"/>
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
                      <DollarSign className="w-3.5 h-3.5"/>
                      Add Dividend
                    </Button>
                  }
              />
              <EditPriceDialog
                  instrument={{
                    id: pos.instrument.id,
                    name: pos.instrument.name,
                    symbol: pos.instrument.symbol,
                    lastPrice: pos.lastPrice,
                    lastPriceAsOf: pos.lastPriceAsOf,
                  }}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Edit className="w-3.5 h-3.5"/>
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
                      <Zap className="w-3.5 h-3.5"/>
                      Corporate Actions
                    </Button>
                  }
              />
            </div>

            {showMergerNudge && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  No live price for this holding. If the company merged or delisted, record a <strong className="font-semibold">Merger</strong> corporate action to migrate it into the surviving stock.
                </div>
              </div>
            )}

            <div className="text-slate-700 dark:text-slate-300 font-bold">Summary</div>

            <div
                className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all grid grid-cols-2 sm:grid-cols-3 gap-2">
              <MetricItem label="Quantity" value={pos.quantity}/>
              <MetricItem label="Avg Cost" value={formatMoney(pos.avgCost)}/>
              <MetricItem label="Invested" value={formatMoney(pos.invested)}/>
              <MetricItem
                  label="Current Value"
                  value={formatMoney(pos.currentValue)}
                  subValue={
                    parseNumber(pos.quantity) > 0 && !pos.lastPrice && pos.currentValue ? (
                      <Badge
                        variant="outline"
                        className="text-2xs px-1 py-0 font-normal text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30"
                      >
                        at cost
                      </Badge>
                    ) : undefined
                  }
              />
              <MetricItem
                  label="Last Price (LTP)"
                  value={formatMoney(pos.lastPrice)}
                  subValue={
                    pos.lastPriceAsOf ? (
                        <div className="text-2xs text-slate-400">As of {formatDate(pos.lastPriceAsOf)}</div>
                    ) : undefined
                  }
              />
              <MetricItem
                  label="Unrealized P&L"
                  value={`${unrl >= 0 ? '+' : ''}${formatMoney(pos.unrealizedGainLoss)}`}
                  valueClassName={unrl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
                  subValue={
                    <div
                        className={`text-2xs font-bold ${
                            unrlPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                    >
                      {unrlPct >= 0 ? '+' : ''}
                      {pos.unrealizedGainLossPercent}%
                    </div>
                  }
              />
              <MetricItem
                  label="Realized P&L"
                  value={`${rlz >= 0 ? '+' : ''}${formatMoney(pos.realizedGainLoss)}`}
                  valueClassName={rlz >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
              />
              <MetricItem
                  label="Dividends"
                  value={formatMoney(pos.dividends || '0')}
                  valueClassName="text-emerald-600 dark:text-emerald-400"
              />
              <MetricItem label="Total Charges" value={formatMoney(pos.totalCharges)}/>
              <MetricItem
                  label="XIRR"
                  value={pos.xirr ? `${pos.xirr}%` : 'N/A'}
                  valueClassName="text-blue-600 dark:text-blue-400"
              />
              <MetricItem
                  label="Abs Return"
                  value={pos.absoluteReturnPercent ? `${pos.absoluteReturnPercent}%` : 'N/A'}
                  valueClassName="text-blue-600 dark:text-blue-400"
              />
            </div>

            <div className="text-slate-700 dark:text-slate-300 font-bold">Trade History</div>
            {isLoadingTrades && holdingTrades.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin"/>
                  Loading trades...
                </div>
            ) : holdingTrades.length === 0 ? (
                <div
                    className="text-center py-10 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200/60 dark:border-slate-800 text-xs text-slate-400 italic">
                  No trades recorded for this holding yet.
                </div>
            ) : (
                <div
                    className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                  {holdingTrades.map((tx) => {
                    const isBuy = tx.type === 'buy';
                    const totalAmt = parseNumber(tx.quantity) * parseNumber(tx.price);

                    return (
                        <div
                            key={tx.id}
                            className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Badge
                                  className={`text-2xs uppercase px-1.5 py-0 font-extrabold border-0 ${
                                      isBuy
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  }`}
                              >
                                {tx.type}
                              </Badge>
                              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                              {tx.quantity} units @ {formatMoney(tx.price)}
                            </span>
                            </div>
                            <div className="text-2xs text-slate-400 flex items-center gap-1">
                              <span>{formatDate(tx.tradeDate)}</span>
                              <span>•</span>
                              <span>{tx.brokerName}</span>
                              {tx.notes && (
                                  <>
                                    <span>•</span>
                                    <span className="italic truncate max-w-[150px]">{tx.notes}</span>
                                  </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                                {formatMoney(totalAmt)}
                              </div>
                              {tx.totalCharges && parseNumber(tx.totalCharges) > 0 && (
                                  <div className="text-2xs text-slate-400">
                                    Charges: {formatMoney(tx.totalCharges)}
                                  </div>
                              )}
                            </div>

                            <EditTransactionDialog transaction={tx} brokerAccounts={brokerAccounts}
                                                   onSuccess={fetchHoldingTrades}/>
                          </div>
                        </div>
                    );
                  })}
                </div>
            )}

            <div className="text-slate-700 dark:text-slate-300 font-bold">Price History</div>
            <PriceHistoryPanel
                instrument={{
                  id: pos.instrument.id,
                  name: pos.instrument.name,
                  symbol: pos.instrument.symbol,
                  lastPrice: pos.lastPrice,
                }}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
  );
}
