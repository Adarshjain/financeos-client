'use client';

import { CalendarDays, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { getRewardReport, listRewardLines } from '@/actions/rewards';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Account } from '@/lib/account.types';
import type {
  PagedRewardLines,
  RewardLine,
  RewardLineReason,
  RewardReport,
  RewardRuleBreakdown,
} from '@/lib/rewards.types';
import { accountAnniversaryDate, anniversaryYearRange } from '@/lib/rewards.types';
import { cn, formatDate, formatMoney, parseCalendarDate, toCalendarDate } from '@/lib/utils';

/** Reason shown as plain colored text (not a badge) — label + a short human explanation for the detail dialog. */
const REASON_META: Record<RewardLineReason, { label: string; textClass: string; explain: string }> = {
  MATCHED: { label: 'Earned', textClass: 'text-emerald-600 dark:text-emerald-400', explain: 'Earned in full under the matched rule.' },
  PARTIAL_CAP: { label: 'Cap clamped', textClass: 'text-amber-600 dark:text-amber-500', explain: 'Earned, but clamped by a per-transaction or period cap.' },
  CAP_EXHAUSTED: { label: 'Cap exhausted', textClass: 'text-red-500 dark:text-red-400', explain: 'The matched rule’s period cap was already used up.' },
  EXCLUDED_BY_RULE: { label: 'Excluded by rule', textClass: 'text-slate-500 dark:text-slate-400', explain: 'Matched a zero-rate rule — an explicit exclusion.' },
  BELOW_SLAB: { label: 'Below slab', textClass: 'text-slate-500 dark:text-slate-400', explain: 'The spend was smaller than one slab of the matched points rule.' },
  ROUNDED_TO_ZERO: { label: 'Rounds to 0', textClass: 'text-slate-500 dark:text-slate-400', explain: 'The cashback rounded down to zero under the rule’s rounding mode.' },
  TIER_ZERO: { label: 'Tier earns 0', textClass: 'text-slate-500 dark:text-slate-400', explain: 'At the current tier-window spend level, the applicable tier (or its slab) yields zero.' },
  NO_RULE: { label: 'No rule', textClass: 'text-slate-400 dark:text-slate-500', explain: 'No reward rule matched this transaction.' },
  FULLY_REFUNDED: { label: 'Refunded', textClass: 'text-sky-600 dark:text-sky-400', explain: 'Linked refunds reduced the eligible amount to zero.' },
  TRANSFER_OR_PAYMENT: { label: 'Transfer / payment', textClass: 'text-slate-400 dark:text-slate-500', explain: 'Transfer, card-payment or reversal legs never earn rewards.' },
  TXN_EXCLUDED: { label: 'Txn excluded', textClass: 'text-slate-400 dark:text-slate-500', explain: 'This transaction is marked excluded from analytics.' },
};

function lineDescription(line: RewardLine): string {
  return line.description || line.sourcedDescription || '—';
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
            <span className="text-[10px] text-slate-400">→</span>
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
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-500">
          Some statement-cycle caps fell back to calendar months — add statements for this account to get exact cycle windows.
        </div>
      )}
      {report?.anniversaryFallback && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-500">
          Some anniversary-year windows fell back to calendar years — set the card’s anniversary date by editing the account on the Accounts page.
        </div>
      )}

      {/* Summary */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-3.5">
          {summary ? (
            <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-2.5', loading && 'opacity-60')}>
              <div>
                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">Eligible spend</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatMoney(summary.basisSpend)}</p>
                <p className="text-[10px] text-slate-400">{summary.matchedCount}/{summary.transactionCount} txns earned</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">Gross rewards</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatMoney(summary.grossValueInr)}
                  {summary.points + summary.milestonesPts > 0 && (
                    <span className="text-sky-600 dark:text-sky-400"> + {summary.points + summary.milestonesPts} pts</span>
                  )}
                </p>
                <p className="text-[10px] text-slate-400">
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
                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">Adjustments</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {formatMoney(summary.discounts - summary.fees)}
                </p>
                <p className="text-[10px] text-slate-400">
                  +{formatMoney(summary.discounts)} discounts − {formatMoney(summary.fees)} fees
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">Effective benefit</p>
                <p className={cn(
                  'text-sm font-bold',
                  summary.effectiveValueInr >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500',
                )}>
                  {formatMoney(summary.effectiveValueInr)}
                </p>
                <p className="text-[10px] text-slate-400">
                  {summary.effectivePct != null ? `${summary.effectivePct}% of spend` : '—'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">Select an account to see rewards.</p>
          )}
        </CardContent>
      </Card>

      {/* Milestone progress */}
      {report && report.milestones.length > 0 && (
        <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5', loading && 'opacity-60')}>
          {report.milestones.map((m, i) => {
            const pct = m.threshold > 0 ? Math.min(100, Math.round((m.progress / m.threshold) * 100)) : 0;
            const progressText = m.basis === 'SPEND'
              ? `${formatMoney(m.progress)} of ${formatMoney(m.threshold)}`
              : `${m.progress} of ${m.threshold} txns${m.minTxnAmount ? ` (${formatMoney(m.minTxnAmount)}+ each)` : ''}`;
            return (
              <div key={`${m.milestoneId}-${m.windowStart}-${i}`}
                   className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{m.name}</span>
                  <span className={cn(
                    'text-[10px] font-semibold whitespace-nowrap',
                    m.achieved ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500',
                  )}>
                    {(() => {
                      const payout = m.rewardType === 'POINTS' ? `${m.payoutValue ?? 0} pts` : formatMoney(m.payoutValue ?? 0);
                      return m.achieved
                        ? m.payoutType === 'CASH_VALUE' ? `Achieved · ${payout}` : 'Achieved'
                        : m.payoutType === 'CASH_VALUE' ? `${payout} at target` : 'Tracker';
                    })()}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {m.windowType === 'ONE_TIME' && 'One-time · '}
                  {formatDate(m.windowStart)} – {formatDate(m.windowEnd)}
                  {m.achieved && m.payoutDate && ` · credited ${formatDate(m.payoutDate)}`}
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">
                    <span>{progressText}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', m.achieved ? 'bg-emerald-500' : 'bg-amber-500')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Per-rule cards */}
      {report && report.rules.length > 0 && (
        <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5', loading && 'opacity-60')}>
          {report.rules.map((rule: RewardRuleBreakdown) => {
            const cap = rule.capStatus;
            const capPct = cap && cap.cap > 0 ? Math.min(100, Math.round((cap.used / cap.cap) * 100)) : null;
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
                    'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0',
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
                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                  {rule.matchedCount} txns · on {formatMoney(rule.basisMatched)}
                </div>
                {cap && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">
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
                          capPct != null && capPct >= 100 ? 'bg-red-500' : capPct != null && capPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500',
                        )}
                        style={{ width: `${capPct ?? 0}%` }}
                      />
                    </div>
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
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {formatDate(line.effectiveDate)}
                    </span>
                    <span className={cn('text-[10px] font-semibold whitespace-nowrap', REASON_META[line.reason].textClass)}>
                      {REASON_META[line.reason].label}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {lineDescription(line)}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
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
                  <th className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide">Date</th>
                  <th className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide">Description</th>
                  <th className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide text-right">Basis</th>
                  <th className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide">Rule</th>
                  <th className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide text-right">Earned</th>
                  <th className="px-3 py-2 font-semibold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide">Why</th>
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
                    <td className="px-3 py-2 max-w-[220px] truncate text-slate-700 dark:text-slate-300">
                      {lineDescription(line)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatMoney(line.basis)}
                      {line.basis !== line.amount && (
                        <span className="text-[10px] text-slate-400 block">of {formatMoney(line.amount)}</span>
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
                    <td className={cn('px-3 py-2 text-[10px] font-semibold whitespace-nowrap', REASON_META[line.reason].textClass)}>
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
        <DialogContent className="sm:max-w-[420px] p-4">
          {selectedLine && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">Reward Calculation</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-2 text-xs">
                <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 p-3 space-y-1.5">
                  <p className="font-semibold text-slate-700 dark:text-slate-200 break-words">
                    {lineDescription(selectedLine)}
                  </p>
                  {selectedLine.description && selectedLine.sourcedDescription
                    && selectedLine.description !== selectedLine.sourcedDescription && (
                    <p className="text-[10px] text-slate-400 break-words">{selectedLine.sourcedDescription}</p>
                  )}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] pt-1">
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
                    <span className="text-slate-400 text-[11px]">Rule</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedLine.ruleName ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 text-[11px]">Earned</span>
                    <span className={cn('font-bold', selectedLine.earned > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')}>
                      {selectedLine.earned > 0 ? formatEarned(selectedLine) : '—'}
                    </span>
                  </div>
                  <p className={cn('text-[11px] font-medium pt-1 border-t border-slate-100 dark:border-slate-800/60', REASON_META[selectedLine.reason].textClass)}>
                    {REASON_META[selectedLine.reason].label} — {REASON_META[selectedLine.reason].explain}
                  </p>
                </div>
                <p className="text-[9px] text-slate-300 dark:text-slate-600 font-mono break-all">
                  txn {selectedLine.transactionId}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
