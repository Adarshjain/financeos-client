'use client';

import { useCallback, useEffect, useState } from 'react';

import { listInvestmentTransactions } from '@/actions/investments';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Broker } from '@/lib/account.types';
import { InvestmentTransactionResponse, Position } from '@/lib/types';

import { HoldingHeaderBadges } from './holding-detail/HoldingHeaderBadges';
import { HoldingSummaryMetrics } from './holding-detail/HoldingSummaryMetrics';
import { HoldingTradeHistory } from './holding-detail/HoldingTradeHistory';
import { PriceHistoryPanel } from './PriceHistoryPanel';

const HOLDING_TRADES_PAGE_SIZE = 500;

interface HoldingDetailDialogProps {
  pos: Position;
  brokerAccounts: Broker[];
  allPositions: Position[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HoldingDetailDialog({
  pos,
  brokerAccounts,
  allPositions,
  open,
  onOpenChange,
}: HoldingDetailDialogProps) {
  const [holdingTrades, setHoldingTrades] = useState<
    InvestmentTransactionResponse[]
  >([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);

  const fetchHoldingTrades = useCallback(async () => {
    setIsLoadingTrades(true);
    try {
      const filters = pos.holdingId
        ? { holdingId: pos.holdingId }
        : {
            brokerAccountId: pos.brokerAccountId,
            instrumentId: pos.instrument.id,
          };
      const res = await listInvestmentTransactions(
        0,
        HOLDING_TRADES_PAGE_SIZE,
        filters
      );
      if (res.success) {
        const rows = [...(res.data.content || [])].sort(
          (a, b) =>
            new Date(b.tradeDate).getTime() - new Date(a.tradeDate).getTime()
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
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{pos.instrument.name}</span>
              {pos.instrument.symbol && (
                <span className="text-xs font-semibold text-slate-400">
                  ({pos.instrument.symbol})
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 flex items-center gap-2 mt-1"></DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-3">
          <HoldingHeaderBadges
            pos={pos}
            brokerAccounts={brokerAccounts}
            allPositions={allPositions}
            fetchHoldingTrades={fetchHoldingTrades}
          />

          <div className="text-slate-700 dark:text-slate-300 font-bold">
            Summary
          </div>

          <HoldingSummaryMetrics pos={pos} />

          <div className="text-slate-700 dark:text-slate-300 font-bold">
            Trade History
          </div>
          <HoldingTradeHistory
            holdingTrades={holdingTrades}
            isLoadingTrades={isLoadingTrades}
            brokerAccounts={brokerAccounts}
            onSuccess={fetchHoldingTrades}
          />

          <div className="text-slate-700 dark:text-slate-300 font-bold">
            Price History
          </div>
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
