'use client';

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  REASON_META,
  RewardCardRecommendation,
} from '@/lib/rewards.types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

interface RecommendationCardItemProps {
  card: RewardCardRecommendation;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function RecommendationCardItem({
  card,
  isExpanded,
  onToggleExpand,
}: RecommendationCardItemProps) {
  const isBest = card.rank === 1;

  return (
    <Card
      className={cn(
        'rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm transition-all',
        isBest && 'border-emerald-200 dark:border-emerald-900/50'
      )}
    >
      <CardContent className="p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          {/* Left Info */}
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-400">
                #{card.rank}
              </span>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                {card.accountName}
              </h3>
              {isBest && (
                <span className="text-2xs uppercase tracking-wide font-bold text-emerald-600 dark:text-emerald-400">
                  Best
                </span>
              )}
            </div>
            <div className="text-2xs text-slate-400">
              Guaranteed {formatMoney(card.guaranteedValueInr)}
              {card.milestoneValueInr > 0 &&
                ` + Milestone ${formatMoney(card.milestoneValueInr)}`}
            </div>
          </div>

          {/* Right Return & Action */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {formatMoney(card.totalValueInr)}
              </div>
              <div className="text-2xs text-slate-400 font-medium">
                {card.effectiveRatePct}%
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onToggleExpand}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Notice Banners */}
        {card.pointValueSource === 'DEFAULT' && card.pointsValued && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-500 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>
              Assumed {formatMoney(card.pointValueInr)}/pt — set point value in
              rewards config
            </span>
          </div>
        )}
        {card.cycleFallback && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-500 flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span>Statement cycle fallback active</span>
          </div>
        )}
        {card.noRulesConfigured && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>No reward rules configured</span>
          </div>
        )}

        {/* Expanded Detail Panel */}
        {isExpanded && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            {/* Rule Lines */}
            <div className="space-y-1.5">
              <div className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
                Rule Breakdown
              </div>
              <div className="space-y-1.5">
                {card.ruleLines.map((line, lIdx) => {
                  const reasonMeta =
                    REASON_META[line.reason] || {
                      label: line.reason,
                      textClass: 'text-slate-500',
                    };
                  return (
                    <div
                      key={lIdx}
                      className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {line.ruleName || 'Base Rule Evaluation'}
                          {line.stacking && (
                            <span className="ml-1.5 px-1 py-0.2 rounded text-2xs bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                              {line.stacking}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500">
                          Outcome:{' '}
                          <span className={reasonMeta.textClass}>
                            {reasonMeta.label}
                          </span>
                        </div>
                        {line.capStatus && (
                          <div className="text-2xs text-slate-400 pt-0.5">
                            <span>
                              Cap headroom{' '}
                              {formatMoney(
                                line.capStatus.capRemainingBefore
                              )}{' '}
                              of {formatMoney(line.capStatus.totalCap)}
                              {line.capStatus.bucketName
                                ? ` (shared: ${line.capStatus.bucketName})`
                                : ''}
                              {line.capStatus.windowEnd
                                ? ` · window ends ${formatDate(
                                    line.capStatus.windowEnd
                                  )}`
                                : ''}
                            </span>
                            <div className="mt-1 h-1.5 max-w-44 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  line.capStatus.capRemainingBefore <= 0
                                    ? 'bg-rose-400'
                                    : 'bg-emerald-500'
                                )}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      (line.capStatus.capRemainingBefore /
                                        line.capStatus.totalCap) *
                                        100
                                    )
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-slate-800 dark:text-slate-100">
                          {line.earnedUnit === 'POINTS'
                            ? `${line.earned} pts`
                            : formatMoney(line.earned)}
                        </div>
                        {line.earnedUnit === 'POINTS' && (
                          <div className="text-2xs text-slate-400">
                            = {formatMoney(line.earnedValueInr)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {card.ruleLines.length === 0 && (
                  <p className="text-xs text-slate-400 italic">
                    No matching rule lines.
                  </p>
                )}
              </div>
            </div>

            {/* Milestone Statuses */}
            {card.milestones.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
                  Milestone Proximity & Crossings
                </div>
                <div className="space-y-1.5">
                  {card.milestones.map((m) => (
                    <div
                      key={m.milestoneId}
                      className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {m.crosses && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 inline mr-1" />
                          )}
                          {m.name}
                        </div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatMoney(m.scoredValueInr)}
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-between text-2xs text-slate-400">
                        <span>
                          Progress: {formatMoney(m.progress)} /{' '}
                          {formatMoney(m.threshold)}
                        </span>
                        {m.crosses ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            Crosses threshold on this spend!
                          </span>
                        ) : (
                          <span>
                            {formatMoney(m.remainingToThreshold)} to go — valued
                            at {formatMoney(m.scoredValueInr)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
