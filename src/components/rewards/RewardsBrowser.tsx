'use client';

import { CalendarDays, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { getRewardReport, listRewardLines } from '@/actions/rewards';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Account } from '@/lib/account.types';
import type {
  MilestoneStatus,
  PagedRewardLines,
  RewardLine,
  RewardReport,
  RewardRuleBreakdown,
} from '@/lib/rewards.types';
import { accountAnniversaryDate, anniversaryYearRange, REASON_META } from '@/lib/rewards.types';
import { cn, formatDate, formatMoney, parseCalendarDate, toCalendarDate } from '@/lib/utils';

function lineDescription(line: RewardLine): string {

  return line.description || line.sourcedDescription || '—';
}

function milestoneProgressText(m: MilestoneStatus): string {
  return m.basis === 'SPEND'
    ? `${formatMoney(m.progress)} of ${formatMoney(m.threshold)}`
    : `${m.progress} of ${m.threshold} txns${m.minTxnAmount ? ` (${formatMoney(m.minTxnAmount)}+ each)` : ''}`;
}

/** Sum of the payouts a set of milestones pays (or would pay) out, as "₹2,500 + 5000 pts". */
function milestonePayoutTotal(list: MilestoneStatus[]): string {
  const paying = list.filter((m) => m.payoutType === 'CASH_VALUE');
  const inr = paying.filter((m) => m.rewardType !== 'POINTS').reduce((s, m) => s + (m.payoutValue ?? 0), 0);
  const pts = paying.filter((m) => m.rewardType === 'POINTS').reduce((s, m) => s + (m.payoutValue ?? 0), 0);
  return [inr > 0 ? formatMoney(inr) : null, pts > 0 ? `${pts} pts` : null].filter(Boolean).join(' + ');
}

/** One row of the milestone list — a progress bar only while the milestone is unachieved. */
function MilestoneRow({ m }: { m: MilestoneStatus }) {
  const pct = m.threshold > 0 ? Math.min(100, Math.round((m.progress / m.threshold) * 100)) : 0;
  const payout = m.rewardType === 'POINTS' ? `${m.payoutValue ?? 0} pts` : formatMoney(m.payoutValue ?? 0);
  return (
    <div className="px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{m.name}</span>
        <span className={cn(
          'text-2xs font-semibold whitespace-nowrap',
          m.achieved ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500',
        )}>
          {m.achieved
            ? m.payoutType === 'CASH_VALUE' ? `Achieved · ${payout}` : 'Achieved'
            : m.payoutType === 'CASH_VALUE' ? `${payout} at target` : 'Tracker'}
        </span>
      </div>
      <div className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">
        {m.windowType === 'ONE_TIME' && 'One-time · '}
        {formatDate(m.windowStart)} – {formatDate(m.windowEnd)}
        {m.achieved && m.payoutDate && ` · credited ${formatDate(m.payoutDate)}`}
      </div>
      {m.achieved ? (
        <div className="mt-1.5 text-2xs text-slate-400 dark:text-slate-500">
          {milestoneProgressText(m)}
        </div>
      ) : (
        <div className="mt-2">
          <div className="flex justify-between text-2xs text-slate-400 dark:text-slate-500 mb-0.5">
            <span>{milestoneProgressText(m)}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function MilestoneSection({ title, items, meta, metaClass, open, onToggle }: {
  title: string;
  items: MilestoneStatus[];
  meta: string;
  metaClass: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-3 hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">{title}</h3>
          <Badge variant="outline" size="sm">{items.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {meta && <span className={cn('text-2xs font-semibold', metaClass)}>{meta}</span>}
          {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <CardContent className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((m, i) => (
            <MilestoneRow key={`${m.milestoneId}-${m.windowStart}-${i}`} m={m} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

type RangePreset =
  | 'THIS_ANNIVERSARY_YEAR'
  | 'LAST_ANNIVERSARY_YEAR'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'LAST_3_MONTHS'
  | 'THIS_FY'
  | 'CUSTOM';

const RANGE_PRESET_LABELS: Record<RangePreset, string> = {
  THIS_ANNIVERSARY_YEAR: 'This anniversary year',
  LAST_ANNIVERSARY_YEAR: 'Previous anniversary year',
  THIS_MONTH: 'This month',
  LAST_MONTH: 'Last month',
  LAST_3_MONTHS: 'Last 3 months',
  THIS_FY: 'This FY',
  CUSTOM: 'Custom range',
};

function presetRange(preset: Exclude<RangePreset, 'CUSTOM'>, anniversary: string | null): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case 'THIS_ANNIVERSARY_YEAR':
      return anniversaryYearRange(anniversary, 0);
    case 'LAST_ANNIVERSARY_YEAR':
      return anniversaryYearRange(anniversary, -1);
    case 'THIS_MONTH':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case 'LAST_MONTH':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    case 'LAST_3_MONTHS':
      return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to: now };
    case 'THIS_FY': {
      // Indian financial year: April 1 onwards.
      const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      return { from: new Date(fyYear, 3, 1), to: now };
    }
  }
}

function formatEarned(line: { earned: number; earnedUnit: 'RUPEES' | 'POINTS' }): string {
  return line.earnedUnit === 'POINTS' ? `${line.earned} pts` : formatMoney(line.earned);
}

interface RewardsBrowserProps {
  accounts: Account[];
  initialAccountId: string;
  initialFrom: string;
  initialTo: string;
  initialReport: RewardReport | null;
  initialLines: PagedRewardLines | null;
}

export default function RewardsBrowser({
  accounts,
  initialAccountId,
  initialFrom,
  initialTo,
  initialReport,
  initialLines,
}: RewardsBrowserProps) {
  const [accountId, setAccountId] = useState(initialAccountId);
  // The default view is the card's current anniversary year (calendar year when
  // no anniversary is set) — the window most caps/milestones actually run on.
  const [preset, setPreset] = useState<RangePreset>('THIS_ANNIVERSARY_YEAR');
  const [from, setFrom] = useState<Date>(parseCalendarDate(initialFrom));
  const [to, setTo] = useState<Date>(parseCalendarDate(initialTo));
  const [report, setReport] = useState<RewardReport | null>(initialReport);
  const [lines, setLines] = useState<PagedRewardLines | null>(initialLines);
  const [ruleFilter, setRuleFilter] = useState<string | undefined>();
  const [selectedLine, setSelectedLine] = useState<RewardLine | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialLines?.size ?? 25);
  const [loading, setLoading] = useState(false);
  const [inProgressOpen, setInProgressOpen] = useState(true);
  const [completedOpen, setCompletedOpen] = useState(false);

  // Monotonic sequence: a response only lands if no newer request superseded it.
  const requestSeq = useRef(0);
  // The (account, range) the current report belongs to — pagination/rule-filter
  // changes reuse it instead of re-running the whole engine for /report.
  const reportKey = useRef(`${initialAccountId}|${initialFrom}|${initialTo}`);

  const fetchAll = useCallback(async () => {
    if (!accountId) return;
    const seq = ++requestSeq.current;
    const fromStr = toCalendarDate(from);
    const toStr = toCalendarDate(to);
    const key = `${accountId}|${fromStr}|${toStr}`;
    const needReport = key !== reportKey.current;

    const [linesRes, reportRes] = await Promise.all([
      listRewardLines({ accountId, from: fromStr, to: toStr, ruleId: ruleFilter, page, size: pageSize }),
      needReport ? getRewardReport(accountId, fromStr, toStr) : Promise.resolve(null),
    ]);
    if (seq !== requestSeq.current) return; // stale response — drop it
    if (reportRes) {
      if (reportRes.success) {
        setReport(reportRes.data);
        reportKey.current = key;
      } else {
        // Never leave the previous account/range's cards rendered against the new
        // lines — clear the report (and any rule filter that belonged to it).
        setReport(null);
        setRuleFilter(undefined);
        toast.error(reportRes.error.message);
      }
    }
    if (linesRes.success) {
      setLines(linesRes.data);
    } else {
      toast.error(linesRes.error.message);
    }
    setLoading(false);
  }, [accountId, from, to, ruleFilter, page, pageSize]);

  // Initial data comes from the server page; refetch only on filter changes.
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  const withSpinner = (mutate: () => void) => {
    setLoading(true);
    mutate();
  };

  const summary = report?.summary;

  const milestones = report?.milestones ?? [];
  const milestonesInProgress = milestones.filter((m) => !m.achieved);
  const milestonesCompleted = milestones.filter((m) => m.achieved);
  // Shown in the headers so a collapsed section still says what it is worth.
  const inProgressPayout = milestonePayoutTotal(milestonesInProgress);
  const completedPayout = milestonePayoutTotal(milestonesCompleted);

  const dateTrigger = (date: Date) => (
    <button
      type="button"
      className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs px-3 h-8 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
    >
      <CalendarDays className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
      {formatDate(toCalendarDate(date))}
    </button>
  );

  const anniversaryFor = (id: string) => accountAnniversaryDate(accounts.find((a) => a.id === id));

  const handlePresetChange = (value: string) => {
    const next = value as RangePreset;
    if (next === 'CUSTOM') {
      // Dates stay as-is, so no fetch fires — a spinner here would never clear.
      setPreset(next);
      return;
    }
    withSpinner(() => {
      setPreset(next);
      const range = presetRange(next, anniversaryFor(accountId));
      setFrom(range.from);
      setTo(range.to);
      setPage(0);
    });
  };

  const handleAccountChange = (id: string) => {
    withSpinner(() => {
      setAccountId(id);
      setRuleFilter(undefined);
      setPage(0);
      // Anniversary-anchored presets are per-card — recompute the range for the new card.
      if (preset === 'THIS_ANNIVERSARY_YEAR' || preset === 'LAST_ANNIVERSARY_YEAR') {
        const range = presetRange(preset, anniversaryFor(id));
        setFrom(range.from);
        setTo(range.to);
      }
    });
  };

  const selectTriggerClass =
    'h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold flex-1 min-w-32';

  const renderActionBar = (isMobile = false) => (
    <div className={cn('flex items-center gap-2 w-full', isMobile ? 'flex-col sm:flex-row text-xs' : 'flex-row flex-wrap')}>
      <div className={cn('flex flex-row gap-2 flex-wrap items-center', isMobile ? 'w-full' : 'flex-1')}>
        {/* Account */}
        <Select value={accountId} onValueChange={handleAccountChange}>
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id} className="text-xs font-medium">{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date range preset */}
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="Range" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
            {(Object.keys(RANGE_PRESET_LABELS) as RangePreset[]).map((p) => (
              <SelectItem key={p} value={p} className="text-xs font-medium">{RANGE_PRESET_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {preset === 'CUSTOM' && (
          <div className="flex items-center gap-1.5">
            <DatePicker date={from} onSelect={(d) => d && withSpinner(() => { setFrom(d); setPage(0); })}
                        trigger={dateTrigger(from)} />
            <span className="text-2xs text-slate-400">→</span>
            <DatePicker date={to} onSelect={(d) => d && withSpinner(() => { setTo(d); setPage(0); })}
                        trigger={dateTrigger(to)} />
          </div>
        )}

        {/* Rule filter (mirrors clicking a rule card) */}
        <Select
          value={ruleFilter ?? 'all'}
          onValueChange={(v) => withSpinner(() => { setRuleFilter(v === 'all' ? undefined : v); setPage(0); })}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="All rules" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
            <SelectItem value="all" className="text-xs font-medium">All rules</SelectItem>
            {(report?.rules ?? []).map((r) => (
              <SelectItem key={r.ruleId} value={r.ruleId} className="text-xs font-medium">{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400 shrink-0" />}
      </div>

      {/* Mobile: pagination lives in the PAB, under the filter row */}
      {isMobile && lines && (
        <div className="w-full border-t border-slate-100 dark:border-slate-800 pt-2">
          <TablePagination
            page={{
              number: lines.number,
              size: lines.size,
              totalElements: lines.totalElements,
              totalPages: lines.totalPages,
            }}
            onPageChange={(p) => withSpinner(() => setPage(p))}
            onSizeChange={(s) => withSpinner(() => { setPageSize(s); setPage(0); })}
            unit="line"
            loading={loading}
            className="text-xs"
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Desktop Filter / Action Bar */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        {renderActionBar(false)}
      </Card>

      {/* Mobile: filters live in the bottom PageActionBar */}
      <PageActionBar>{renderActionBar(true)}</PageActionBar>

      {report?.cycleFallback && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-500">
          Some statement-cycle caps fell back to calendar months — add statements for this account to get exact cycle windows.
        </div>
      )}
      {report?.anniversaryFallback && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-500">
          Some anniversary-year windows fell back to calendar years — set the card’s anniversary date by editing the account on the Accounts page.
        </div>
      )}
      {report?.perCardAttributionIncomplete != null && report.perCardAttributionIncomplete > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-500 flex items-center justify-between gap-2">
          <span>
            {report.perCardAttributionIncomplete} transaction{report.perCardAttributionIncomplete === 1 ? '' : 's'} on this multi-card account {report.perCardAttributionIncomplete === 1 ? 'is' : 'are'} unattributed and could not match card-scoped rules or limits.
          </span>
          <a
            href="/accounts"
            className="shrink-0 text-xs font-semibold underline text-amber-700 dark:text-amber-400 hover:text-amber-800"
          >
            Manage cards
          </a>
        </div>
      )}

      {/* Summary */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-3.5">
          {summary ? (
            <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-2.5', loading && 'opacity-60')}>
              <div>
                <p className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">Eligible spend</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatMoney(summary.basisSpend)}</p>
                <p className="text-2xs text-slate-400">{summary.matchedCount}/{summary.transactionCount} txns earned</p>
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">Gross rewards</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatMoney(summary.grossValueInr)}
                  {summary.points + summary.milestonesPts > 0 && (
                    <span className="text-sky-600 dark:text-sky-400"> + {summary.points + summary.milestonesPts} pts</span>
                  )}
                </p>
                <p className="text-2xs text-slate-400">
                  {[
                    summary.cashbackInr > 0 ? `${formatMoney(summary.cashbackInr)} cashback` : null,
                    summary.milestonesInr > 0 ? `${formatMoney(summary.milestonesInr)} milestones` : null,
                    summary.points > 0 ? `${summary.points} pts` : null,
                    summary.milestonesPts > 0 ? `${summary.milestonesPts} milestone pts` : null,
                  ].filter(Boolean).join(' + ')}
                  {summary.grossPct != null && ` · ${summary.grossPct}% cash`}
                </p>
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">Adjustments</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {formatMoney(summary.discounts - summary.fees)}
                </p>
                <p className="text-2xs text-slate-400">
                  +{formatMoney(summary.discounts)} discounts − {formatMoney(summary.fees)} fees
                </p>
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">Effective benefit</p>
                <p className={cn(
                  'text-sm font-bold',
                  summary.effectiveValueInr >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500',
                )}>
                  {formatMoney(summary.effectiveValueInr)}
                </p>
                <p className="text-2xs text-slate-400">
                  {summary.effectivePct != null ? `${summary.effectivePct}% of spend` : '—'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">Select an account to see rewards.</p>
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
                <div key={card.cardId ?? 'unattributed'} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
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
                      {card.txnCount} transaction{card.txnCount === 1 ? '' : 's'} · {formatMoney(card.basisSpend)} spend
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      {card.points > 0 ? (
                        <>
                          {card.cashbackInr > 0 ? `${formatMoney(card.cashbackInr)} + ` : ''}{card.points} pts
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

      {/* Milestones — open by default; completed ones collapsed and without a progress bar */}
      {milestones.length > 0 && (
        <div className={cn('flex flex-col gap-2.5', loading && 'opacity-60')}>
          {milestonesInProgress.length > 0 && (
            <MilestoneSection
              title="Milestones"
              items={milestonesInProgress}
              meta={inProgressPayout && `${inProgressPayout} at target`}
              metaClass="text-slate-400 dark:text-slate-500"
              open={inProgressOpen}
              onToggle={() => setInProgressOpen((o) => !o)}
            />
          )}
          {milestonesCompleted.length > 0 && (
            <MilestoneSection
              title="Completed Milestones"
              items={milestonesCompleted}
              meta={completedPayout}
              metaClass="text-emerald-600 dark:text-emerald-400"
              open={completedOpen}
              onToggle={() => setCompletedOpen((o) => !o)}
            />
          )}
        </div>
      )}

      {/* Per-rule cards */}
      {report && report.rules.length > 0 && (
        <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5', loading && 'opacity-60')}>
          {report.rules.map((rule: RewardRuleBreakdown) => {
            const cap = rule.capStatus;
            const capPct = cap && cap.used != null && cap.cap > 0 ? Math.min(100, Math.round((cap.used / cap.cap) * 100)) : null;
            const selected = ruleFilter === rule.ruleId;
            return (
              <button
                key={rule.ruleId}
                type="button"
                onClick={() => withSpinner(() => { setRuleFilter(selected ? undefined : rule.ruleId); setPage(0); })}
                className={cn(
                  'text-left bg-white dark:bg-slate-900/60 rounded-xl border shadow-sm p-3 transition-colors',
                  selected
                    ? 'border-emerald-500 dark:border-emerald-600 ring-1 ring-emerald-500/30'
                    : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700',
                  !rule.activeInRange && 'opacity-55',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{rule.name}</span>
                  <span className={cn(
                    'text-2xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0',
                    rule.stacking === 'EXCLUSIVE'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      : 'bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400',
                  )}>
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
                    {cap.counterScope === 'PER_CARD' && (cap.perCard ?? []).length > 0 ? (
                      (cap.perCard ?? []).map((pc) => {
                        const cardPct = cap.cap > 0 ? Math.min(100, Math.round((pc.used / cap.cap) * 100)) : null;
                        return (
                          <div key={pc.cardId ?? 'unattributed'} className="flex flex-col gap-0.5">
                            <div className="flex justify-between text-2xs text-slate-400 dark:text-slate-500">
                              <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[130px]">
                                {pc.cardLabel}: {rule.earnedUnit === 'POINTS' ? `${pc.used}/${cap.cap} pts` : `${formatMoney(pc.used)}/${formatMoney(cap.cap)}`}
                              </span>
                              <span>resets {formatDate(cap.windowEnd)}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  cardPct != null && cardPct >= 100 ? 'bg-rose-500' : cardPct != null && cardPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500',
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
                            {cap.sharedBucket ? `Shared "${cap.sharedBucket}" ` : 'Cap '}
                            {rule.earnedUnit === 'POINTS' ? `${cap.used}/${cap.cap} pts` : `${formatMoney(cap.used)}/${formatMoney(cap.cap)}`}
                            {cap.cycleFallback && ' (month fallback)'}
                          </span>
                          <span>resets {formatDate(cap.windowEnd)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              capPct != null && capPct >= 100 ? 'bg-rose-500' : capPct != null && capPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500',
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
      )}

      {/* Drill-down lines */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-0">
          {/* Mobile: card list */}
          <div className={cn('block md:hidden divide-y divide-slate-100 dark:divide-slate-800', loading && 'opacity-60')}>
            {(lines?.content ?? []).length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">No transactions in this range.</div>
            ) : (
              (lines?.content ?? []).map((line, i) => (
                <div
                  key={`${line.transactionId}-${line.ruleId ?? 'none'}-${i}`}
                  onClick={() => setSelectedLine(line)}
                  className="p-3 space-y-1.5 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 active:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xs text-slate-400 dark:text-slate-500 whitespace-nowrap flex items-center gap-1.5">
                      <span>{formatDate(line.effectiveDate)}</span>
                      {line.cardLabel && (
                        <span className="text-2xs px-1 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-medium">
                          {line.cardLabel}
                        </span>
                      )}
                    </span>
                    <span className={cn('text-2xs font-semibold whitespace-nowrap', REASON_META[line.reason].textClass)}>
                      {REASON_META[line.reason].label}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {lineDescription(line)}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatMoney(line.basis)}
                      {line.basis !== line.amount && ` of ${formatMoney(line.amount)}`}
                      {line.ruleName && <span className="text-slate-400"> · {line.ruleName}</span>}
                    </span>
                    <span className={cn(
                      'text-xs font-bold whitespace-nowrap',
                      line.earned > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500',
                    )}>
                      {line.earned > 0 ? formatEarned(line) : '—'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop: table */}
          <div className={cn('hidden md:block overflow-x-auto', loading && 'opacity-60')}>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
                  <th className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 text-2xs uppercase tracking-wide">Date</th>
                  <th className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 text-2xs uppercase tracking-wide">Description</th>
                  <th className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 text-2xs uppercase tracking-wide text-right">Basis</th>
                  <th className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 text-2xs uppercase tracking-wide">Rule</th>
                  <th className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 text-2xs uppercase tracking-wide text-right">Earned</th>
                  <th className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 text-2xs uppercase tracking-wide">Why</th>
                </tr>
              </thead>
              <tbody>
                {(lines?.content ?? []).map((line, i) => (
                  <tr key={`${line.transactionId}-${line.ruleId ?? 'none'}-${i}`}
                      onClick={() => setSelectedLine(line)}
                      className="border-b border-slate-50 dark:border-slate-800/50 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {formatDate(line.effectiveDate)}
                    </td>
                    <td className="px-3 py-2 max-w-[220px] text-slate-700 dark:text-slate-300">
                      <div className="truncate">{lineDescription(line)}</div>
                      {line.cardLabel && (
                        <span className="inline-block mt-0.5 text-2xs px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded font-medium">
                          {line.cardLabel}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatMoney(line.basis)}
                      {line.basis !== line.amount && (
                        <span className="text-2xs text-slate-400 block">of {formatMoney(line.amount)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400 max-w-[140px] truncate">
                      {line.ruleName ?? '—'}
                    </td>
                    <td className={cn(
                      'px-3 py-2 text-right font-bold whitespace-nowrap',
                      line.earned > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500',
                    )}>
                      {line.earned > 0 ? formatEarned(line) : '—'}
                    </td>
                    <td className={cn('px-3 py-2 text-2xs font-semibold whitespace-nowrap', REASON_META[line.reason].textClass)}>
                      {REASON_META[line.reason].label}
                    </td>
                  </tr>
                ))}
                {(lines?.content ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-400 text-xs">
                      No transactions in this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Desktop pagination — on mobile it lives in the PageActionBar instead */}
          {lines && (
            <div className="hidden lg:block">
              <TablePagination
                page={{
                  number: lines.number,
                  size: lines.size,
                  totalElements: lines.totalElements,
                  totalPages: lines.totalPages,
                }}
                onPageChange={(p) => withSpinner(() => setPage(p))}
                onSizeChange={(s) => withSpinner(() => { setPageSize(s); setPage(0); })}
                unit="line"
                loading={loading}
                className="border-t border-slate-100 dark:border-slate-800 px-3"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reward line → source transaction detail */}
      <Dialog open={!!selectedLine} onOpenChange={(o) => !o && setSelectedLine(null)}>
        <DialogContent className="sm:max-w-[420px]">
          {selectedLine && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">Reward Calculation</DialogTitle>
              </DialogHeader>
              <DialogBody className="flex flex-col gap-2 text-xs">
                <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 p-3 space-y-1.5">
                  <p className="font-semibold text-slate-700 dark:text-slate-200 break-words">
                    {lineDescription(selectedLine)}
                  </p>
                  {selectedLine.description && selectedLine.sourcedDescription
                    && selectedLine.description !== selectedLine.sourcedDescription && (
                    <p className="text-2xs text-slate-400 break-words">{selectedLine.sourcedDescription}</p>
                  )}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs pt-1">
                    <span className="text-slate-400">Transaction date</span>
                    <span className="text-right font-semibold text-slate-700 dark:text-slate-300">{formatDate(selectedLine.transactionDate)}</span>
                    {selectedLine.effectiveDate !== selectedLine.transactionDate && (<>
                      <span className="text-slate-400">Settled (used for rewards)</span>
                      <span className="text-right font-semibold text-slate-700 dark:text-slate-300">{formatDate(selectedLine.effectiveDate)}</span>
                    </>)}
                    <span className="text-slate-400">Amount charged</span>
                    <span className="text-right font-semibold text-slate-700 dark:text-slate-300">{formatMoney(selectedLine.amount)}</span>
                    {selectedLine.basis !== selectedLine.amount && (<>
                      <span className="text-slate-400">Eligible after refunds</span>
                      <span className="text-right font-semibold text-slate-700 dark:text-slate-300">{formatMoney(selectedLine.basis)}</span>
                    </>)}
                    {selectedLine.mcc && (<>
                      <span className="text-slate-400">MCC</span>
                      <span className="text-right font-mono text-slate-700 dark:text-slate-300">{selectedLine.mcc}</span>
                    </>)}
                    {selectedLine.channel && (<>
                      <span className="text-slate-400">Channel</span>
                      <span className="text-right font-semibold text-slate-700 dark:text-slate-300">{selectedLine.channel}</span>
                    </>)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 text-xs">Rule</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedLine.ruleName ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 text-xs">Earned</span>
                    <span className={cn('font-bold', selectedLine.earned > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')}>
                      {selectedLine.earned > 0 ? formatEarned(selectedLine) : '—'}
                    </span>
                  </div>
                  <p className={cn('text-xs font-medium pt-1 border-t border-slate-100 dark:border-slate-800/60', REASON_META[selectedLine.reason].textClass)}>
                    {REASON_META[selectedLine.reason].label} — {REASON_META[selectedLine.reason].explain}
                  </p>
                </div>
                <p className="text-2xs text-slate-300 dark:text-slate-600 font-mono break-all">
                  txn {selectedLine.transactionId}
                </p>
              </DialogBody>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
