'use client';

import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RewardReport } from '@/lib/rewards.types';
import { cn, formatMoney } from '@/lib/utils';

interface RewardsSummaryCardsProps {
  report: RewardReport | null;
  loading: boolean;
}

export function RewardsSummaryCards({
  report,
  loading,
}: RewardsSummaryCardsProps) {
  const summary = report?.summary;

  return (
    <>
      {report?.cycleFallback && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-500">
          Some statement-cycle caps fell back to calendar months — add statements
          for this account to get exact cycle windows.
        </div>
      )}
      {report?.anniversaryFallback && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-500">
          Some anniversary-year windows fell back to calendar years — set the
          card’s anniversary date by editing the account on the Accounts page.
        </div>
      )}
      {report?.perCardAttributionIncomplete != null &&
        report.perCardAttributionIncomplete > 0 && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-500 flex items-center justify-between gap-2">
            <span>
              {report.perCardAttributionIncomplete} transaction
              {report.perCardAttributionIncomplete === 1 ? '' : 's'} on this
              multi-card account{' '}
              {report.perCardAttributionIncomplete === 1 ? 'is' : 'are'}{' '}
              unattributed and could not match card-scoped rules or limits.
            </span>
            <Link
              href="/accounts"
              className="shrink-0 text-xs font-semibold underline text-amber-700 dark:text-amber-400 hover:text-amber-800"
            >
              Manage cards
            </Link>
          </div>
        )}

      {/* Summary */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-3.5">
          {summary ? (
            <div
              className={cn(
                'grid grid-cols-2 md:grid-cols-4 gap-2.5',
                loading && 'opacity-60'
              )}
            >
              <div>
                <p className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
                  Eligible spend
                </p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {formatMoney(summary.basisSpend)}
                </p>
                <p className="text-2xs text-slate-400">
                  {summary.matchedCount}/{summary.transactionCount} txns earned
                </p>
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
                  Gross rewards
                </p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatMoney(summary.grossValueInr)}
                  {summary.points + summary.milestonesPts > 0 && (
                    <span className="text-sky-600 dark:text-sky-400">
                      {' '}
                      + {summary.points + summary.milestonesPts} pts
                    </span>
                  )}
                </p>
                <p className="text-2xs text-slate-400">
                  {[
                    summary.cashbackInr > 0
                      ? `${formatMoney(summary.cashbackInr)} cashback`
                      : null,
                    summary.milestonesInr > 0
                      ? `${formatMoney(summary.milestonesInr)} milestones`
                      : null,
                    summary.points > 0 ? `${summary.points} pts` : null,
                    summary.milestonesPts > 0
                      ? `${summary.milestonesPts} milestone pts`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' + ')}
                  {summary.grossPct != null && ` · ${summary.grossPct}% cash`}
                </p>
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
                  Adjustments
                </p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {formatMoney(summary.discounts - summary.fees)}
                </p>
                <p className="text-2xs text-slate-400">
                  +{formatMoney(summary.discounts)} discounts −{' '}
                  {formatMoney(summary.fees)} fees
                </p>
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
                  Effective benefit
                </p>
                <p
                  className={cn(
                    'text-sm font-bold',
                    summary.effectiveValueInr >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-500'
                  )}
                >
                  {formatMoney(summary.effectiveValueInr)}
                </p>
                <p className="text-2xs text-slate-400">
                  {summary.effectivePct != null
                    ? `${summary.effectivePct}% of spend`
                    : '—'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">
              Select an account to see rewards.
            </p>
          )}
        </CardContent>
      </Card>

      {/* By card breakdown (shown only when 2+ cards exist) */}
      {report?.byCard && report.byCard.length >= 2 && (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-3.5 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              By card
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {report.byCard.map((card) => (
                <div
                  key={card.cardId ?? 'unattributed'}
                  className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-700 dark:text-slate-200 truncate flex items-center gap-1.5">
                      <span>{card.cardLabel}</span>
                      {card.unattributed && (
                        <span className="text-2xs font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 uppercase tracking-wide shrink-0">
                          unassigned
                        </span>
                      )}
                    </div>
                    <div className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {card.txnCount} transaction
                      {card.txnCount === 1 ? '' : 's'} ·{' '}
                      {formatMoney(card.basisSpend)} spend
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      {card.points > 0 ? (
                        <>
                          {card.cashbackInr > 0
                            ? `${formatMoney(card.cashbackInr)} + `
                            : ''}
                          {card.points} pts
                        </>
                      ) : (
                        formatMoney(card.cashbackInr)
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
