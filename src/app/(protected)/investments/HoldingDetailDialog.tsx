'use client';

import { useQuery } from '@tanstack/react-query';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Broker } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import {
  InvestmentTransactionResponse,
  PagedInvestmentTransactionResponse,
  Position,
} from '@/lib/types';

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
  const filters = pos.holdingId
    ? { holdingId: pos.holdingId }
    : {
        brokerAccountId: pos.brokerAccountId,
        instrumentId: pos.instrument.id,
      };
  const queryParams = { page: 0, size: HOLDING_TRADES_PAGE_SIZE, ...filters };

  const {
    data,
    isLoading: isLoadingTrades,
    refetch: fetchHoldingTrades,
  } = useQuery({
    queryKey: keys.investments.transactions(queryParams),
    queryFn: async () =>
      (
        await api.GET('/api/v1/investments/transactions', {
          params: {
            query: {
              page: queryParams.page,
              size: queryParams.size,
              brokerAccountId: queryParams.brokerAccountId,
              instrumentId: queryParams.instrumentId,
              holdingId: queryParams.holdingId,
            },
          },
        })
      ).data! as PagedInvestmentTransactionResponse,
    enabled: open,
  });

  const holdingTrades = [...(data?.content || [])].sort(
    (a, b) => new Date(b.tradeDate).getTime() - new Date(a.tradeDate).getTime()
  ) as InvestmentTransactionResponse[];

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
              lastPrice: pos.lastPrice ?? undefined,
            }}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
