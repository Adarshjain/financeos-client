'use client';

// The small read-only pieces around the underlying-data table: period tabs,
// filter chips, the "Not counted" disclosure and the summary under the table.

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateRange, formatDateRangeFull } from '@/lib/date-range';
import { cn } from '@/lib/utils';

import {
  aggregationLabel,
  formatAmount,
  formatKpiValue,
} from './underlying.helpers';
import type {
  KpiUnderlyingResponse,
  UnderlyingExcludedItem,
  UnderlyingFilterChip,
  UnderlyingPeriod,
} from './underlying.types';

interface PeriodTabsProps {
  period: UnderlyingPeriod;
  onPeriodChange: (period: UnderlyingPeriod) => void;
  /** The previous window; null when it has no bounds. */
  previousRange: { from: string; to: string } | null;
  /** The previous period's value, already formatted; null when there is none. */
  previousValueText: string | null;
}

/** "This period" / "Previous · Sep · ₹38,900". */
export function UnderlyingPeriodTabs({
  period,
  onPeriodChange,
  previousRange,
  previousValueText,
}: PeriodTabsProps) {
  const previousLabel = [
    previousRange ? `Previous · ${formatDateRange(previousRange.from, previousRange.to)}` : 'Previous period',
    previousValueText,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Tabs value={period} onValueChange={(v) => onPeriodChange(v as UnderlyingPeriod)}>
      <TabsList className="grid h-8 w-full grid-cols-2 text-xs sm:inline-grid sm:w-auto">
        <TabsTrigger value="current" className="px-2.5 text-xs">
          This period
        </TabsTrigger>
        <TabsTrigger
          value="previous"
          className="min-w-0 px-2.5 text-xs"
          title={previousRange ? formatDateRangeFull(previousRange.from, previousRange.to) : undefined}
        >
          <span className="truncate">{previousLabel}</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

/** The KPI's filters, one read-only chip each: "Account is HDFC Regalia". */
export function UnderlyingFilterChips({ filters }: { filters: UnderlyingFilterChip[] }) {
  if (filters.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Filters">
      {filters.map((f, i) => (
        <li key={`${f.field}-${i}`}>
          <Badge variant="slate">
            {f.fieldLabel} {f.text}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

interface NotCountedProps {
  items: UnderlyingExcludedItem[];
  /** Format of the KPI's measure; the items' values are in the same unit. */
  format: string | null | undefined;
}

/** Collapsed list of what the total leaves out (net worth: excluded / closed / failed accounts). */
export function NotCountedDisclosure({ items, format }: NotCountedProps) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-between"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Not counted ({items.length})
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </Button>
      {open && (
        <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
              {[item.name, item.reasonLabel, item.value != null ? formatAmount(item.value, format) : null]
                .filter(Boolean)
                .join(' · ')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Under the table: "Sum ₹4,500" (or "Max ₹900" plus a note for a winner-only
 * MIN/MAX), then any datasource totals such as Assets / Liabilities. The row
 * count is the table footer's.
 */
export function UnderlyingSummary({ data }: { data: KpiUnderlyingResponse }) {
  const aggregate = `${aggregationLabel(data.aggregation)} ${formatKpiValue(data.value, data)}`;
  return (
    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
      <p className="font-medium tabular-nums">
        {aggregate}
      </p>
      {data.winnerOnly && data.rowCount > 0 && (
        <p className="text-slate-500">
          {data.rowCount === 1 ? 'Showing the row that sets this value' : 'Showing the rows that set this value'}
        </p>
      )}
      {data.summaryLines.map((line) => (
        <p key={line.label} className="tabular-nums">
          {line.label} {formatAmount(line.value, line.format)}
        </p>
      ))}
    </div>
  );
}
