'use client';

import { CalendarDays, Loader2 } from 'lucide-react';

import { TablePagination } from '@/components/reports/views/TablePagination';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Account } from '@/lib/account.types';
import { PagedRewardLines, RewardReport } from '@/lib/rewards.types';
import { cn, formatDate, toCalendarDate } from '@/lib/utils';

import { RANGE_PRESET_LABELS, RANGE_PRESETS, RangePreset } from './helpers';

interface RewardsBrowserFilterBarProps {
  accounts: Account[];
  accountId: string;
  onAccountChange: (id: string) => void;
  preset: RangePreset;
  onPresetChange: (p: string) => void;
  from: Date;
  onFromChange: (d: Date) => void;
  to: Date;
  onToChange: (d: Date) => void;
  ruleFilter: string | undefined;
  onRuleFilterChange: (ruleId: string | undefined) => void;
  report: RewardReport | null;
  loading: boolean;
  isMobile?: boolean;
  lines: PagedRewardLines | null;
  onPageChange: (p: number) => void;
  onSizeChange: (s: number) => void;
}

export function RewardsBrowserFilterBar({
  accounts,
  accountId,
  onAccountChange,
  preset,
  onPresetChange,
  from,
  onFromChange,
  to,
  onToChange,
  ruleFilter,
  onRuleFilterChange,
  report,
  loading,
  isMobile = false,
  lines,
  onPageChange,
  onSizeChange,
}: RewardsBrowserFilterBarProps) {
  const selectTriggerClass =
    'h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold flex-1 min-w-32';

  const dateTrigger = (date: Date) => (
    <button
      type="button"
      className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs px-3 h-8 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
    >
      <CalendarDays className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
      {formatDate(toCalendarDate(date))}
    </button>
  );

  return (
    <div
      className={cn(
        'flex items-center gap-2 w-full',
        isMobile ? 'flex-col sm:flex-row text-xs' : 'flex-row flex-wrap'
      )}
    >
      <div
        className={cn(
          'flex flex-row gap-2 flex-wrap items-center',
          isMobile ? 'w-full' : 'flex-1'
        )}
      >
        {/* Account */}
        <Select value={accountId} onValueChange={onAccountChange}>
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
            {accounts.map((a) => (
              <SelectItem
                key={a.id}
                value={a.id}
                className="text-xs font-medium"
              >
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date range preset */}
        <Select value={preset} onValueChange={onPresetChange}>
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="Range" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
            {RANGE_PRESETS.map((p) => (
              <SelectItem key={p} value={p} className="text-xs font-medium">
                {RANGE_PRESET_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {preset === 'CUSTOM' && (
          <div className="flex items-center gap-1.5">
            <DatePicker
              date={from}
              onSelect={(d) => d && onFromChange(d)}
              trigger={dateTrigger(from)}
            />
            <span className="text-2xs text-slate-400">→</span>
            <DatePicker
              date={to}
              onSelect={(d) => d && onToChange(d)}
              trigger={dateTrigger(to)}
            />
          </div>
        )}

        {/* Rule filter */}
        <Select
          value={ruleFilter ?? 'all'}
          onValueChange={(v) => onRuleFilterChange(v === 'all' ? undefined : v)}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="All rules" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
            <SelectItem value="all" className="text-xs font-medium">
              All rules
            </SelectItem>
            {(report?.rules ?? []).map((r) => (
              <SelectItem
                key={r.ruleId}
                value={r.ruleId}
                className="text-xs font-medium"
              >
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {loading && (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400 shrink-0" />
        )}
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
            onPageChange={onPageChange}
            onSizeChange={onSizeChange}
            unit="line"
            loading={loading}
            className="text-xs"
          />
        </div>
      )}
    </div>
  );
}
