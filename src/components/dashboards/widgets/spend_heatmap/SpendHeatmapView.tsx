'use client';

// spend_heatmap (view `heatmap`): daily spend as a calendar — weeks as columns,
// Monday to Sunday down, darker on heavier days, today outlined, days after
// today left blank. Cells size to the widget; when it is too narrow for the
// whole window the most recent weeks that fit are shown (never a sideways
// scroll). A day with spend opens its transactions ("View underlying data").

import { CalendarDays } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useElementSize } from '@/components/charts/useElementSize';
import type { TemplateViewProps } from '@/components/dashboards/builtins/registry';
import { LazyKpiUnderlyingDialog } from '@/components/reports/underlying/LazyUnderlyingDialogs';
import { isoToDisplay } from '@/components/ui/date-input';
import { EmptyState } from '@/components/ui/empty-state';
import { widgetParams } from '@/lib/dashboards.helpers';
import { todayInAppZone } from '@/lib/date-range';
import { buildFilter, isChartData } from '@/lib/reports.helpers';
import type { RunReportRequest } from '@/lib/reports.types';
import { cn, formatMoney } from '@/lib/utils';

import { adhocKpi, WidgetNote } from '../cards_spending_kit/kit';
import { buildHeatmap, type HeatCell, type HeatWeek } from './heatmap.model';

export const HEATMAP_DEFAULT_MONTHS = 6;

/** Intensity fills, none → heaviest (the picker preview uses the same scale). */
export const HEAT_LEVEL_CLASSES = [
  'bg-slate-100 dark:bg-slate-800',
  'bg-emerald-500/20',
  'bg-emerald-500/40',
  'bg-emerald-500/70',
  'bg-emerald-600',
];

const GAP = 3;
const MIN_CELL = 9;
const MAX_CELL = 18;
// Width of the Mon/Wed/Fri label column, and the vertical space outside the grid (month row + legend).
const LABEL_COL = 26;
const CHROME_H = 48;
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

/** The heatmap's months param (1–12), defaulting to 6. */
export function heatmapMonths(params: Record<string, unknown>): number {
  const m = params.months;
  return typeof m === 'number' && m >= 1 ? Math.min(12, Math.floor(m)) : HEATMAP_DEFAULT_MONTHS;
}

/** One day's spend, as the calendar counts it: debits, not excluded, not a transfer leg. */
export function daySpendRequest(date: string): RunReportRequest {
  return adhocKpi('transactions', 'spend', [
    buildFilter('type', 'is', 'DEBIT'),
    buildFilter('isExcluded', 'is', false),
    buildFilter('isTransferLeg', 'is', false),
    buildFilter('date', 'is', date),
  ]);
}

/** Cell size and how many of the latest weeks fit the box; an unmeasured box (0×0) shows all at the default size. */
export function fitGrid(width: number, height: number, weeks: number): { cell: number; shown: number } {
  if (width <= 0) return { cell: 12, shown: weeks };
  const avail = width - LABEL_COL;
  let cell = Math.floor((avail + GAP) / Math.max(1, weeks)) - GAP;
  if (height > 0) cell = Math.min(cell, Math.floor((height - CHROME_H + GAP) / 7) - GAP);
  cell = Math.max(MIN_CELL, Math.min(MAX_CELL, cell));
  const shown = Math.max(1, Math.min(weeks, Math.floor((avail + GAP) / (cell + GAP))));
  return { cell, shown };
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Month labels over the weeks on screen: a column where a month starts names it,
 * and the first column names its own month unless one starts within the next two;
 * a label closer than three columns to the previous one is dropped so they never
 * overlap.
 */
export function visibleMonthLabels(weeks: HeatWeek[]): (string | null)[] {
  let last = -Infinity;
  return weeks.map((week, i) => {
    const first = week.days.find((d) => d != null);
    // The first column names its month unless a month starts right after it.
    const startsSoon = weeks.slice(1, 3).some((w) => w.monthLabel != null);
    const label =
      i === 0 && first && !startsSoon ? MONTH_SHORT[Number(first.date.slice(5, 7)) - 1] : i === 0 ? null : week.monthLabel;
    if (!label || i - last < 3) return null;
    last = i;
    return label;
  });
}

function Cell({ cell, size, onOpen }: { cell: HeatCell | null; size: number; onOpen: (date: string) => void }) {
  const style = { width: size, height: size };
  if (!cell) return <span style={style} aria-hidden="true" />;
  const label = `${isoToDisplay(cell.date)}: ${cell.amount > 0 ? formatMoney(cell.amount) : 'no spend'}`;
  const className = cn(
    'rounded-[3px]',
    HEAT_LEVEL_CLASSES[cell.level],
    cell.isToday && 'ring-1 ring-slate-700 ring-offset-1 ring-offset-white dark:ring-slate-200 dark:ring-offset-slate-900',
  );
  if (cell.amount <= 0) {
    return <span style={style} className={className} title={label} aria-label={label} role="img" data-date={cell.date} />;
  }
  return (
    <button
      type="button"
      style={style}
      className={cn(className, 'transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500')}
      title={label}
      aria-label={label}
      data-date={cell.date}
      data-level={cell.level}
      onClick={() => onOpen(cell.date)}
    />
  );
}

export function SpendHeatmapView({ widget, data }: TemplateViewProps) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const [openDay, setOpenDay] = useState<string | null>(null);
  const months = heatmapMonths(widgetParams(widget));
  const today = todayInAppZone();
  const model = useMemo(
    () => (isChartData(data) ? buildHeatmap(data, today, months) : null),
    [data, today, months],
  );

  if (!model) return <WidgetNote>This widget can&apos;t show this data.</WidgetNote>;
  if (model.spendDays === 0) {
    return (
      <EmptyState
        compact
        icon={CalendarDays}
        title="No spending in this period"
        description="Debits on your accounts fill in the calendar day by day."
        className="m-4"
      />
    );
  }

  const { cell, shown } = fitGrid(size.width, size.height, model.weeks.length);
  const weeks = model.weeks.slice(model.weeks.length - shown);
  const labels = visibleMonthLabels(weeks);

  return (
    <div ref={ref} className="flex h-full min-h-0 flex-col overflow-hidden px-4 pb-3" data-testid="spend-heatmap-view">
      <div
        // Truncated (or not yet measured): pin the latest weeks to the right edge.
        className={cn('flex', shown < model.weeks.length || size.width === 0 ? 'justify-end' : 'justify-start')}
        style={{ gap: GAP }}
        data-testid="heatmap-grid"
        data-weeks={weeks.length}
      >
        <div className="flex shrink-0 flex-col" style={{ gap: GAP, width: LABEL_COL - GAP, paddingTop: 16 }} aria-hidden="true">
          {DAY_LABELS.map((d, i) => (
            <span key={i} className="text-2xs leading-none text-slate-400" style={{ height: cell, lineHeight: `${cell}px` }}>
              {d}
            </span>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={week.start} className="flex shrink-0 flex-col" style={{ gap: GAP, width: cell }}>
            <span className="h-[13px] overflow-visible whitespace-nowrap text-2xs leading-none text-slate-400" aria-hidden="true">
              {labels[wi] ?? ''}
            </span>
            {week.days.map((day, i) => (
              <Cell key={day?.date ?? `${week.start}-${i}`} cell={day} size={cell} onOpen={setOpenDay} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-2xs text-slate-400" data-testid="heatmap-legend">
        <span>Less</span>
        {HEAT_LEVEL_CLASSES.map((c) => (
          <span key={c} className={cn('h-2.5 w-2.5 rounded-[3px]', c)} aria-hidden="true" />
        ))}
        <span>More</span>
      </div>
      {openDay && (
        <LazyKpiUnderlyingDialog
          source={{ kind: 'adhoc', request: daySpendRequest(openDay) }}
          title={`Spending on ${isoToDisplay(openDay)}`}
          open
          onOpenChange={(o) => !o && setOpenDay(null)}
        />
      )}
    </div>
  );
}
