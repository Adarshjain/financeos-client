import { AlertCircle, Calendar, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import React from 'react';

import { CardCycleSummary } from '@/lib/statement.types';
import { formatDate, formatMoney } from '@/lib/utils';

interface CardCycleWidgetProps {
  summary: CardCycleSummary | null | undefined;
  fallbackCreditLimit?: number;
}

export function CardCycleWidget({ summary, fallbackCreditLimit = 0 }: CardCycleWidgetProps) {
  if (!summary || !summary.statementId) {
    return (
      <div className="py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Sync your first statement to see billing cycle summary</span>
      </div>
    );
  }

  const totalDue = typeof summary.totalAmountDue === 'string' ? parseFloat(summary.totalAmountDue) : (summary.totalAmountDue ?? 0);
  const minDue = typeof summary.minimumAmountDue === 'string' ? parseFloat(summary.minimumAmountDue) : (summary.minimumAmountDue ?? 0);
  const limit = typeof summary.creditLimit === 'string' ? parseFloat(summary.creditLimit) : (summary.creditLimit ?? fallbackCreditLimit);
  const available = typeof summary.availableCreditLimit === 'string' ? parseFloat(summary.availableCreditLimit) : (summary.availableCreditLimit ?? limit - totalDue);
  const usedPct = limit > 0 ? Math.min(100, Math.max(0, ((limit - available) / limit) * 100)) : 0;
  const points = typeof summary.rewardPointsBalance === 'string' ? parseFloat(summary.rewardPointsBalance) : (summary.rewardPointsBalance ?? 0);

  const isPaid = totalDue <= 0;

  return (
    <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
      {/* Top Status Pill & Due Date */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {isPaid ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-350 border border-emerald-200/50 dark:border-emerald-800/40">
            <CheckCircle2 className="w-3 h-3" />
            Paid / No Balance Due
          </span>
        ) : summary.isPastDue ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-800/40">
            <AlertCircle className="w-3 h-3" />
            PAST DUE
          </span>
        ) : summary.daysUntilDue !== null && summary.daysUntilDue !== undefined ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-350 border border-amber-200/50 dark:border-amber-800/40">
            <Clock className="w-3 h-3" />
            Due in {summary.daysUntilDue} {summary.daysUntilDue === 1 ? 'day' : 'days'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Due {formatDate(summary.paymentDueDate)}
          </span>
        )}

        {points > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-350 border border-purple-200/40 dark:border-purple-800/30">
            <Sparkles className="w-3 h-3 text-purple-500" />
            🪙 {points.toLocaleString('en-IN')} pts
          </span>
        )}
      </div>

      {/* Due Amounts Row */}
      <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60">
        <div className="space-y-0.5">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Total Due</span>
          <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {formatMoney(totalDue)}
          </div>
        </div>
        <div className="space-y-0.5 text-right">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Min Due</span>
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono tabular-nums">
            {formatMoney(minDue)}
          </div>
        </div>
      </div>

      {/* Available vs Credit Limit Progress Bar */}
      {limit > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400">
            <span>Available: <strong className="text-slate-700 dark:text-slate-200 font-mono tabular-nums">{formatMoney(available)}</strong></span>
            <span>Limit: <strong className="font-mono tabular-nums">{formatMoney(limit)}</strong></span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all duration-300"
              style={{ width: `${usedPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
