'use client';

// Heatmap: daily values as a calendar, like the spending calendar. Weeks are
// columns (Monday first), weekdays run down, cells are squares in chart-1 at
// four intensity steps (quartiles of the days with a value) over a neutral
// empty fill. When the window is too wide for the box the latest weeks that
// fit are shown, never a sideways scroll. Today is outlined; days after today
// are blank. With `onSelectEntry` a day with a value is pressable.

import { forwardRef, useMemo } from 'react';

import { cn } from '@/components/ds/cn';
import { Text } from '@/components/ds/Text/Text';
import { useElementSize } from '@/lib/charts/useElementSize';
import { todayInAppZone } from '@/lib/date-range';
import { formatDate } from '@/lib/format';
import type { ChartData } from '@/lib/reports.types';

import type { ChartEntry, ChartInput } from './Chart';
import { ChartEmpty } from './ChartParts';
import { CHART_GRID_COLOR, CHART_OUTLINE_COLOR, chartColor } from './chartTokens';
import { chartValueFormat } from './chartValueFormat';
import {
  buildHeatmap,
  type HeatCell,
  HEATMAP_DEFAULT_MONTHS,
  type HeatWeek,
} from './heatmap.model';
import { useMergedRef } from './mergeRefs';

/** Intensity of level 0…4: chart-1 at four opacity steps; level 0 is the neutral `line` fill, solid. */
const LEVEL_OPACITY = [1, 0.25, 0.5, 0.75, 1];
const GAP = 2;
const MIN_CELL = 9;
const MAX_CELL = 18;
/** Width of the weekday label column (w-space-24). */
const LABEL_W = 24;
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Cell size and how many of the latest weeks fit the width; unmeasured shows all at a default size. */
export function fitGrid(
  width: number,
  weeks: number
): { cell: number; shown: number } {
  if (width <= 0) return { cell: 12, shown: weeks };
  const avail = width - LABEL_W - GAP;
  let cell = Math.floor((avail + GAP) / Math.max(1, weeks)) - GAP;
  cell = Math.max(MIN_CELL, Math.min(MAX_CELL, cell));
  const shown = Math.max(
    1,
    Math.min(weeks, Math.floor((avail + GAP) / (cell + GAP)))
  );
  return { cell, shown };
}

/** Month labels over the weeks on screen; one closer than three columns to the previous is dropped. */
export function monthLabels(weeks: HeatWeek[]): (string | null)[] {
  let last = -Infinity;
  return weeks.map((week, i) => {
    const first = week.days.find((d) => d != null);
    const startsSoon = weeks.slice(1, 3).some((w) => w.monthLabel != null);
    const label =
      i === 0 && first && !startsSoon
        ? MONTH_SHORT[Number(first.date.slice(5, 7)) - 1]
        : i === 0
          ? null
          : week.monthLabel;
    if (!label || i - last < 3) return null;
    last = i;
    return label;
  });
}



const CELL_PRESS =
  'cursor-pointer hover:opacity-80 active:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring';

function HeatCellView({
  cell,
  size,
  text,
  onSelect,
}: {
  cell: HeatCell | null;
  size: number;
  text: string;
  onSelect?: () => void;
}) {
  const box = { width: size, height: size };
  if (!cell) return <span style={box} aria-hidden />;
  const mark = (
    <svg aria-hidden viewBox="0 0 10 10" className="block size-full">
      <rect
        width="10"
        height="10"
        rx="2"
        fill={cell.level === 0 ? CHART_GRID_COLOR : chartColor(0)}
        opacity={LEVEL_OPACITY[cell.level]}
      />
      {cell.isToday && (
        <rect
          x="0.5"
          y="0.5"
          width="9"
          height="9"
          rx="1.5"
          fill="none"
          stroke={CHART_OUTLINE_COLOR}
          strokeWidth="1"
        />
      )}
    </svg>
  );
  const common = {
    style: box,
    title: text,
    'aria-label': text,
    'data-date': cell.date,
    'data-level': cell.level,
  };
  if (!onSelect) {
    return (
      <span {...common} role="img" className="block">
        {mark}
      </span>
    );
  }
  return (
    <button
      type="button"
      {...common}
      className={cn('block rounded-ds-sm', CELL_PRESS)}
      onClick={onSelect}
    >
      {mark}
    </button>
  );
}

export interface ChartHeatmapProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  data: ChartInput;
  money: boolean;
  /** How many months the calendar covers (default 6). */
  months?: number;
  onSelectEntry?: (entry: ChartEntry) => void;
  canSelectEntry?: (entry: ChartEntry) => boolean;
}

export const ChartHeatmap = forwardRef<HTMLDivElement, ChartHeatmapProps>(function ChartHeatmap(
  {
  data,
  money,
  months = HEATMAP_DEFAULT_MONTHS,
  onSelectEntry,
  canSelectEntry,
  className,
  ...props
},
  ref,
) {
  const [sizeRef, { width }] = useElementSize<HTMLDivElement>();
  const frameRef = useMergedRef(sizeRef, ref);
  const format = chartValueFormat(money);
  const today = todayInAppZone();
  const model = useMemo(
    () => buildHeatmap(data as ChartData, today, months),
    [data, months, today]
  );
  if (model.spendDays === 0) return <ChartEmpty />;

  const { cell, shown } = fitGrid(width, model.weeks.length);
  const weeks = model.weeks.slice(model.weeks.length - shown);
  const labels = monthLabels(weeks);

  return (
    <div ref={frameRef} className={cn('flex w-full min-w-0 flex-col gap-space-8', className)} {...props}>
      <div
        className={cn(
          'flex gap-space-2',
          shown < model.weeks.length || width === 0
            ? 'justify-end'
            : 'justify-start'
        )}
        data-testid="heatmap-grid"
        data-weeks={weeks.length}
      >
        <div
          aria-hidden
          className="flex w-space-24 shrink-0 flex-col gap-space-2 pt-space-14"
        >
          {DAY_LABELS.map((d, i) => (
            <Text
              key={i}
              variant="micro"
              tone="ink-3"
              className="block leading-none"
              style={{ height: cell, lineHeight: `${cell}px` }}
            >
              {d}
            </Text>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div
            key={week.start}
            className="flex shrink-0 flex-col gap-space-2"
            style={{ width: cell }}
          >
            <Text
              variant="micro"
              tone="ink-3"
              aria-hidden
              className="block h-space-12 overflow-visible whitespace-nowrap leading-none"
            >
              {labels[wi] ?? ''}
            </Text>
            {week.days.map((day, i) => {
              const text = day
                ? `${formatDate(day.date, 'input')}: ${day.amount > 0 ? format.full(day.amount) : 'no value'}`
                : '';
              const entry: ChartEntry | null =
                day && day.amount > 0
                  ? { key: day.date, label: formatDate(day.date, 'input'), value: day.amount }
                  : null;
              return (
                <HeatCellView
                  key={day?.date ?? `${week.start}-${i}`}
                  cell={day}
                  size={cell}
                  text={text}
                  onSelect={
                    onSelectEntry && entry && (canSelectEntry?.(entry) ?? true)
                      ? () => onSelectEntry(entry)
                      : undefined
                  }
                />
              );
            })}
          </div>
        ))}
      </div>
      <div
        className="flex items-center justify-end gap-space-4"
        data-testid="heatmap-legend"
      >
        <Text variant="micro" tone="ink-3">
          Less
        </Text>
        {LEVEL_OPACITY.map((o, i) => (
          <svg key={i} aria-hidden viewBox="0 0 10 10" className="size-icon-xs shrink-0">
            <rect
              width="10"
              height="10"
              rx="2"
              fill={i === 0 ? CHART_GRID_COLOR : chartColor(0)}
              opacity={o}
            />
          </svg>
        ))}
        <Text variant="micro" tone="ink-3">
          More
        </Text>
      </div>
    </div>
  );
});
