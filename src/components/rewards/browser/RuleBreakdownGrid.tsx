'use client';

import { RewardReport, RewardRuleBreakdown } from '@/lib/rewards.types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

interface RuleBreakdownGridProps {
  report: RewardReport | null;
  ruleFilter: string | undefined;
  onSelectRule: (ruleId: string | undefined) => void;
  loading: boolean;
}

export function RuleBreakdownGrid({
  report,
  ruleFilter,
  onSelectRule,
  loading,
}: RuleBreakdownGridProps) {
  if (!report || report.rules.length === 0) return null;

  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5',
        loading && 'opacity-60'
      )}
    >
      {report.rules.map((rule: RewardRuleBreakdown) => {
        const cap = rule.capStatus;
        const capPct =
          cap && cap.used != null && cap.cap > 0
            ? Math.min(100, Math.round((cap.used / cap.cap) * 100))
            : null;
        const selected = ruleFilter === rule.ruleId;
        return (
          <button
            key={rule.ruleId}
            type="button"
            onClick={() => onSelectRule(selected ? undefined : rule.ruleId)}
            className={cn(
              'text-left bg-white dark:bg-slate-900/60 rounded-xl border shadow-sm p-3 transition-colors',
              selected
                ? 'border-emerald-500 dark:border-emerald-600 ring-1 ring-emerald-500/30'
                : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700',
              !rule.activeInRange && 'opacity-55'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                {rule.name}
              </span>
              <span
                className={cn(
                  'text-2xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0',
                  rule.stacking === 'EXCLUSIVE'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    : 'bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400'
                )}
              >
                {rule.stacking === 'EXCLUSIVE' ? 'excl' : 'add'}
              </span>
            </div>
            <div className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {rule.earnedUnit === 'POINTS'
                ? `${rule.earned} pts`
                : formatMoney(rule.earned)}
            </div>
            <div className="text-2xs text-slate-400 dark:text-slate-500">
              {rule.matchedCount} txns · on {formatMoney(rule.basisMatched)}
            </div>
            {cap && (
              <div className="mt-2 flex flex-col gap-1.5">
                {cap.counterScope === 'PER_CARDHOLDER' &&
                (cap.perCard ?? []).length > 0 ? (
                  (cap.perCard ?? []).map((pc) => {
                    const cardPct =
                      cap.cap > 0
                        ? Math.min(100, Math.round((pc.used / cap.cap) * 100))
                        : null;
                    return (
                      <div
                        key={pc.cardId ?? 'unattributed'}
                        className="flex flex-col gap-0.5"
                      >
                        <div className="flex justify-between text-2xs text-slate-400 dark:text-slate-500">
                          <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[130px]">
                            {pc.cardLabel}:{' '}
                            {rule.earnedUnit === 'POINTS'
                              ? `${pc.used}/${cap.cap} pts`
                              : `${formatMoney(pc.used)}/${formatMoney(
                                  cap.cap
                                )}`}
                          </span>
                          <span>resets {formatDate(cap.windowEnd)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              cardPct != null && cardPct >= 100
                                ? 'bg-rose-500'
                                : cardPct != null && cardPct >= 80
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            )}
                            style={{ width: `${cardPct ?? 0}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : cap.used != null ? (
                  <>
                    <div className="flex justify-between text-2xs text-slate-400 dark:text-slate-500 mb-0.5">
                      <span>
                        {cap.sharedBucket
                          ? `Shared "${cap.sharedBucket}" `
                          : 'Cap '}
                        {rule.earnedUnit === 'POINTS'
                          ? `${cap.used}/${cap.cap} pts`
                          : `${formatMoney(cap.used)}/${formatMoney(cap.cap)}`}
                        {cap.cycleFallback && ' (month fallback)'}
                      </span>
                      <span>resets {formatDate(cap.windowEnd)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          capPct != null && capPct >= 100
                            ? 'bg-rose-500'
                            : capPct != null && capPct >= 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        )}
                        style={{ width: `${capPct ?? 0}%` }}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
