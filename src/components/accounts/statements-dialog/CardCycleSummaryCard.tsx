'use client';

import { FileText, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { CardCycleSummary } from '@/lib/statement.types';
import { cn, formatDate, formatNullableMoney } from '@/lib/utils';

interface CardCycleSummaryCardProps {
  cardSummary: CardCycleSummary | null;
  isLoadingCardSummary: boolean;
  cardSummaryError: string | null;
  onRetry: () => void;
}

export function CardCycleSummaryCard({
  cardSummary,
  isLoadingCardSummary,
  cardSummaryError,
  onRetry,
}: CardCycleSummaryCardProps) {
  return (
    <div className="space-y-1 mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Card Cycle Summary</h3>
        </div>
        {cardSummary?.periodEnd && (
          <span className="text-xs text-slate-500 tabular-nums">
            Statement Date: {formatDate(cardSummary.periodEnd)}
          </span>
        )}
      </div>

      {isLoadingCardSummary ? (
        <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          <span className="text-xs">Loading card cycle summary...</span>
        </div>
      ) : cardSummaryError ? (
        <div className="flex items-center justify-center gap-2 py-4 text-xs">
          <span className="text-destructive">
            Couldn&apos;t load the card cycle summary: {cardSummaryError}
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="font-semibold text-destructive underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      ) : !cardSummary || !cardSummary.statementId ? (
        <div className="text-center py-4 text-xs text-slate-400">
          No active statement summary available for this credit card.
        </div>
      ) : (
        /* Hero Metric & Secondary Grid */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-slate-50/70 dark:bg-slate-950/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
          <div className="md:col-span-1 space-y-1 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 pb-3 md:pb-0 md:pr-4">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">
              Total Amount Due
            </span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {formatNullableMoney(cardSummary.totalAmountDue)}
            </div>
            {cardSummary.daysUntilDue !== null && cardSummary.daysUntilDue !== undefined ? (
              <div className="pt-1">
                {cardSummary.daysUntilDue > 0 ? (
                  <Badge
                    variant={cardSummary.daysUntilDue <= 3 ? 'warning' : 'secondary'}
                    className="text-2xs"
                  >
                    Due in {cardSummary.daysUntilDue} days
                  </Badge>
                ) : cardSummary.daysUntilDue === 0 ? (
                  <Badge variant="warning" className="text-2xs bg-amber-500 text-white">
                    Due today
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-2xs">
                    {Math.abs(cardSummary.daysUntilDue)} days overdue
                  </Badge>
                )}
              </div>
            ) : null}
          </div>

          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-xs text-slate-400 dark:text-slate-500 block">Minimum Due</span>
              <span className="font-bold text-slate-900 dark:text-white mt-1 block tabular-nums">
                {formatNullableMoney(cardSummary.minimumAmountDue)}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 dark:text-slate-500 block">Payment Due Date</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 mt-1 block">
                {formatDate(cardSummary.paymentDueDate)}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 dark:text-slate-500 block">Reward Points</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 mt-1 block tabular-nums">
                {cardSummary.rewardPointsBalance !== null &&
                cardSummary.rewardPointsBalance !== undefined
                  ? cardSummary.rewardPointsBalance.toLocaleString()
                  : '—'}
              </span>
            </div>
            <div>
              <div className="flex justify-between items-center text-xs text-slate-400 dark:text-slate-500">
                <span>Utilization</span>
                <span
                  className={cn(
                    'font-bold tabular-nums',
                    cardSummary.utilizationPct !== null && cardSummary.utilizationPct !== undefined
                      ? cardSummary.utilizationPct < 30
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : cardSummary.utilizationPct < 70
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-700 dark:text-slate-300'
                  )}
                >
                  {cardSummary.utilizationPct !== null && cardSummary.utilizationPct !== undefined
                    ? `${cardSummary.utilizationPct}%`
                    : '—'}
                </span>
              </div>
              {cardSummary.utilizationPct !== null && cardSummary.utilizationPct !== undefined ? (
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      cardSummary.utilizationPct < 30
                        ? 'bg-emerald-500'
                        : cardSummary.utilizationPct < 70
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                    )}
                    style={{
                      width: `${Math.min(100, Math.max(0, Number(cardSummary.utilizationPct)))}%`,
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
