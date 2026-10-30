'use client';

// Cartesian renderer (line, area, bar, stackedBar) over Recharts, styled with
// Dinero tokens: series in chart-1…chart-5 (the rest fold into chart-rest),
// recessive axes, a hairline horizontal grid and compact ₹1.2L ticks.

import { forwardRef, useId } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '@/components/ds/cn';
import { truncateLabel } from '@/lib/charts/chart-format';
import {
  type FoldedSeries,
  foldSeries,
  seriesLabel,
  yAxisTicks,
} from '@/lib/charts/chart-series';
import { useElementSize } from '@/lib/charts/useElementSize';

import type { ChartEntry, ChartInput } from './Chart';
import { ChartDataTable, ChartLegend, ChartTooltip } from './ChartParts';
import {
  CHART_AXIS_COLOR,
  CHART_CURSOR_COLOR,
  CHART_GRID_COLOR,
  CHART_MARGIN,
  CHART_REST_COLOR,
  CHART_SLOTS,
  CHART_SURFACE_COLOR,
  chartColor,
} from './chartTokens';
import { chartValueFormat } from './chartValueFormat';
import { useMergedRef } from './mergeRefs';

type ChartRow = Record<string, string | number | null>;
/** The row's category index: category labels can repeat, so a press reads the index, not the label. */
const ROW_INDEX = '__index';

const NARROW_PX = 400;
/** Past this many categories the bars stay upright (a long daily series is not a list). */
const MAX_HORIZONTAL_CATEGORIES = 10;
const ANIMATION_MS = 450;

export interface ChartCartesianProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  data: ChartInput;
  fill?: boolean;
  money: boolean;
  yDomain?: 'zero' | 'data';
  onSelectEntry?: (entry: ChartEntry) => void;
  canSelectEntry?: (entry: ChartEntry) => boolean;
}

export const ChartCartesian = forwardRef<HTMLDivElement, ChartCartesianProps>(function ChartCartesian(
  {
  data,
  fill,
  money,
  yDomain,
  onSelectEntry,
  canSelectEntry,
  className,
  ...props
},
  ref,
) {
  const { chartType, categories } = data;
  const gradientId = useId().replace(/:/g, '');
  const [sizeRef, { width }] = useElementSize<HTMLDivElement>();
  const frameRef = useMergedRef(sizeRef, ref);
  const narrow = width > 0 && width < NARROW_PX;
  const format = chartValueFormat(money);

  const series = foldSeries(
    data.series,
    categories.length,
    data.measure?.aggregation,
    CHART_SLOTS
  );
  const colors: Record<string, string> = {};
  series.forEach((s, i) => {
    colors[seriesLabel(s.name)] = s.folded
      ? CHART_REST_COLOR
      : chartColor(i);
  });
  const colorOf = (s: FoldedSeries) => colors[seriesLabel(s.name)];

  const rows: ChartRow[] = categories.map((c, i) => {
    const row: ChartRow = { category: c, [ROW_INDEX]: i };
    series.forEach((s) => {
      row[s.name] = s.data[i] ?? null;
    });
    return row;
  });

  const fontSize = narrow ? 10 : 12;
  const yTicks = yAxisTicks(
    series,
    categories.length,
    chartType === 'stackedBar',
    yDomain !== 'data'
  );
  const tick = { fontSize, fill: CHART_AXIS_COLOR };
  // A narrow range rounds neighbouring compact ticks to the same text; then every tick shows its full value.
  const compactTexts = yTicks.map((t) => format.compact(t));
  const valueTickText = (v: number) =>
    new Set(compactTexts).size === compactTexts.length ? format.compact(v) : format.full(v);
  // Room per category, in characters; Recharts skips ticks that still collide.
  const labelChars = width
    ? Math.max(
        8,
        Math.min(16, Math.floor(width / categories.length / (fontSize * 0.6)))
      )
    : 12;
  const isBar = chartType !== 'line' && chartType !== 'area';
  const stacked = chartType === 'stackedBar';
  // A few categories whose names would not fit under their bars lie down: names on the left in full, bars run right.
  const longestLabel = categories.reduce((n, c) => Math.max(n, String(c).length), 0);
  const horizontal =
    isBar &&
    width > 0 &&
    categories.length > 1 &&
    categories.length <= MAX_HORIZONTAL_CATEGORIES &&
    longestLabel * fontSize * 0.6 > width / categories.length - 8;
  const nameWidth = Math.min(Math.ceil(longestLabel * fontSize * 0.6) + 4, Math.floor(width * 0.45));
  const valueTicks = { ticks: yTicks, domain: [yTicks[0], yTicks[yTicks.length - 1]] as [number, number] };

  const chrome = [
    <CartesianGrid
      key="grid"
      vertical={horizontal}
      horizontal={!horizontal}
      stroke={CHART_GRID_COLOR}
    />,
    horizontal ? (
      <XAxis
        key="x"
        type="number"
        tick={tick}
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        interval="preserveStartEnd"
        {...valueTicks}
        tickFormatter={valueTickText}
      />
    ) : (
      <XAxis
        key="x"
        dataKey="category"
        tick={tick}
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        minTickGap={narrow ? 8 : 16}
        interval="preserveStartEnd"
        tickFormatter={(v: string) => truncateLabel(String(v), labelChars)}
      />
    ),
    horizontal ? (
      <YAxis
        key="y"
        type="category"
        dataKey="category"
        width={nameWidth}
        tick={tick}
        tickLine={false}
        axisLine={false}
        tickMargin={4}
        interval={0}
      />
    ) : (
      <YAxis
        key="y"
        width="auto"
        tick={tick}
        tickLine={false}
        axisLine={false}
        tickMargin={4}
        {...valueTicks}
        tickFormatter={valueTickText}
      />
    ),
    <Tooltip
      key="tooltip"
      cursor={
        isBar
          ? { fill: CHART_CURSOR_COLOR, opacity: 0.6 }
          : {
              stroke: CHART_AXIS_COLOR,
              strokeOpacity: 0.4,
              strokeWidth: 1,
            }
      }
      content={
        <ChartTooltip
          format={format.full}
          colors={colors}
          showTotal={stacked}
        />
      }
    />,
  ];
  const activeDot = { r: 4, strokeWidth: 2, stroke: CHART_SURFACE_COLOR };
  const entryOf = (s: FoldedSeries, row?: ChartRow): ChartEntry | null => {
    const at = row?.[ROW_INDEX];
    const i = typeof at === 'number' ? at : categories.indexOf(String(row?.category));
    return i < 0
      ? null
      : {
          key: categories[i],
          label: categories[i],
          seriesKey: seriesLabel(s.name),
          value: s.data[i] ?? 0,
          index: i,
        };
  };
  const pressable = (s: FoldedSeries, row?: ChartRow) => {
    const entry = entryOf(s, row);
    return !!onSelectEntry && !!entry && (canSelectEntry?.(entry) ?? true);
  };
  const pressEntry = (s: FoldedSeries, row?: ChartRow) => {
    const entry = entryOf(s, row);
    if (entry && pressable(s, row)) onSelectEntry?.(entry);
  };
  // A pressed point reports through a custom active dot (Recharts gives it the row and the series key).
  const pressDot = (s: FoldedSeries) =>
    onSelectEntry
      ? (p: { cx?: number; cy?: number; payload?: ChartRow }) =>
          pressable(s, p.payload) ? (
            <circle
              cx={p.cx}
              cy={p.cy}
              r={activeDot.r}
              fill={colorOf(s)}
              stroke={activeDot.stroke}
              strokeWidth={activeDot.strokeWidth}
              className="cursor-pointer"
              onClick={() => pressEntry(s, p.payload)}
            />
          ) : (
            <circle
              cx={p.cx}
              cy={p.cy}
              r={activeDot.r}
              fill={colorOf(s)}
              stroke={activeDot.stroke}
              strokeWidth={activeDot.strokeWidth}
            />
          )
      : activeDot;
  const margin = { ...CHART_MARGIN, right: narrow ? 4 : 8 };
  const singlePoint = categories.length === 1;

  let chart: React.ReactElement;
  if (chartType === 'line') {
    chart = (
      <LineChart data={rows} margin={margin}>
        {chrome}
        {series.map((s) => (
          <Line
            key={s.name}
            type="monotone"
            dataKey={s.name}
            name={seriesLabel(s.name)}
            stroke={colorOf(s)}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={
              singlePoint ? { r: 4, strokeWidth: 0, fill: colorOf(s) } : false
            }
            activeDot={pressDot(s)}
            connectNulls
            animationDuration={ANIMATION_MS}
          />
        ))}
      </LineChart>
    );
  } else if (chartType === 'area') {
    chart = (
      <AreaChart data={rows} margin={margin}>
        <defs>
          {series.map((s, i) => (
            <linearGradient
              key={s.name}
              id={`${gradientId}-${i}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={colorOf(s)} stopOpacity={0.28} />
              <stop offset="100%" stopColor={colorOf(s)} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        {chrome}
        {series.map((s, i) => (
          <Area
            key={s.name}
            type="monotone"
            dataKey={s.name}
            name={seriesLabel(s.name)}
            stroke={colorOf(s)}
            strokeWidth={2}
            fill={`url(#${gradientId}-${i})`}
            fillOpacity={1}
            dot={
              singlePoint ? { r: 4, strokeWidth: 0, fill: colorOf(s) } : false
            }
            activeDot={pressDot(s)}
            connectNulls
            animationDuration={ANIMATION_MS}
          />
        ))}
      </AreaChart>
    );
  } else {
    // bar + stackedBar. Only the top segment of a stack gets the rounded cap;
    // stacked segments are split by a hairline of the surface colour.
    const stackId = stacked ? 'stack' : undefined;
    chart = (
      <BarChart data={rows} margin={margin} barGap={2} barCategoryGap="24%" layout={horizontal ? 'vertical' : 'horizontal'}>
        {chrome}
        {series.map((s, i) => (
          <Bar
            key={s.name}
            dataKey={s.name}
            name={seriesLabel(s.name)}
            stackId={stackId}
            fill={colorOf(s)}
            maxBarSize={narrow ? 20 : 28}
            radius={!stacked || i === series.length - 1 ? (horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]) : 0}
            stroke={stacked ? CHART_SURFACE_COLOR : undefined}
            strokeWidth={stacked ? 1 : 0}
            isAnimationActive={false}
            onClick={
              onSelectEntry
                ? (d) => pressEntry(s, (d as { payload?: ChartRow }).payload)
                : undefined
            }
          >
            {onSelectEntry &&
              rows.map((row, i) => (
                <Cell
                  key={i}
                  className={
                    pressable(s, row)
                      ? 'cursor-pointer hover:opacity-80 active:opacity-60'
                      : undefined
                  }
                />
              ))}
          </Bar>
        ))}
      </BarChart>
    );
  }

  return (
    <div
      ref={frameRef}
      className={cn(
        'flex w-full min-w-0 flex-col gap-space-8',
        fill ? 'h-full min-h-0' : 'aspect-video desk:aspect-wide',
        className
      )}
      {...props}
    >
      {series.length > 1 && (
        <ChartLegend
          items={series.map((s) => ({
            name: seriesLabel(s.name),
            color: colorOf(s),
          }))}
          line={chartType === 'line'}
        />
      )}
      <div className="min-h-0 w-full flex-1">
        {/*
          Recharts emits SVG with no accessible name or textual content, so
          mirror the data into a visually-hidden table for screen readers.
        */}
        <ChartDataTable data={data} />
        <ResponsiveContainer width="100%" height="100%">
          {chart}
        </ResponsiveContainer>
      </div>
    </div>
  );
});
