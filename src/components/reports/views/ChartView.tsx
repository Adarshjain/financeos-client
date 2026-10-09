'use client';

// Presentational chart renderer over Recharts. Maps the charting-friendly
// ChartData (categories[] + series[{name,data[]}] aligned by index) onto the
// right chart for `chartType`. Pure — no fetching. Reusable by the dashboard.
//
// Styling: categorical colours come from the --chart-N tokens (light + dark),
// axes are recessive (no axis lines, hairline horizontal grid, compact ₹1.2L
// ticks with an auto-sized Y axis so it doesn't eat narrow screens), and the
// hover layer is a shared tooltip card.

import { useId } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  niceTicks,
  OTHER_COLOR,
  SERIES_SLOTS,
  seriesColor,
  SURFACE_COLOR,
  truncateLabel,
  valueFormat,
} from '@/components/charts/chart-format';
import { ChartTooltipContent } from '@/components/charts/ChartTooltip';
import { useElementSize } from '@/components/charts/useElementSize';
import { isMoneyField } from '@/lib/reports.helpers';
import type { ChartData } from '@/lib/reports.types';
import { cn } from '@/lib/utils';

import { ChartDataTable, ChartPieView, seriesLabel } from './ChartPieView';

type ChartRow = Record<string, string | number | null>;
type Series = ChartData['series'][number];

export type ChartViewData = Pick<
  ChartData,
  'chartType' | 'categories' | 'series'
> &
  Partial<ChartData>;

const NARROW_PX = 400;
const ANIMATION_MS = 450;

// `fill` makes the chart fill its parent's height (for fixed-height containers
// like dashboard widgets) instead of the default fixed height used in flow
// layouts such as the report builder's preview pane.
export function ChartView({
  data,
  fill,
}: {
  data: ChartViewData;
  fill?: boolean;
}) {
  const { chartType, categories, series } = data;

  if (categories.length === 0 || series.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        No data for this configuration.
      </p>
    );
  }

  const money =
    !!data.measure &&
    data.measure.aggregation !== 'count' &&
    isMoneyField(data.measure.field);

  if (chartType === 'pie' || chartType === 'donut') {
    return (
      <ChartPieView
        data={data}
        fill={fill}
        money={money}
        donut={chartType === 'donut'}
      />
    );
  }
  return <CartesianChart data={data} fill={fill} money={money} />;
}

function CartesianChart({
  data,
  fill,
  money,
}: {
  data: ChartViewData;
  fill?: boolean;
  money: boolean;
}) {
  const { chartType, categories } = data;
  const gradientId = useId().replace(/:/g, '');
  const [frameRef, { width }] = useElementSize<HTMLDivElement>();
  const narrow = width > 0 && width < NARROW_PX;
  const format = valueFormat(money);

  const series = foldSeries(
    data.series,
    categories.length,
    data.measure?.aggregation
  );
  const colors: Record<string, string> = {};
  series.forEach((s, i) => {
    colors[seriesLabel(s.name)] = s.folded ? OTHER_COLOR : seriesColor(i);
  });
  const colorOf = (s: FoldedSeries) => colors[seriesLabel(s.name)];

  const rows: ChartRow[] = categories.map((c, i) => {
    const row: ChartRow = { category: c };
    series.forEach((s) => {
      row[s.name] = s.data[i] ?? null;
    });
    return row;
  });

  const fontSize = narrow ? 10 : 12;
  const yTicks = yAxisTicks(
    series,
    categories.length,
    chartType === 'stackedBar'
  );
  const tick = { fontSize, fill: 'hsl(var(--muted-foreground))' };
  // Room per category, in characters; Recharts skips ticks that still collide.
  const labelChars = width
    ? Math.max(
        6,
        Math.min(16, Math.floor(width / categories.length / (fontSize * 0.6)))
      )
    : 12;
  const isBar = chartType !== 'line' && chartType !== 'area';
  const stacked = chartType === 'stackedBar';

  const chrome = [
    <CartesianGrid
      key="grid"
      vertical={false}
      stroke="hsl(var(--chart-grid))"
    />,
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
    />,
    <YAxis
      key="y"
      width="auto"
      tick={tick}
      tickLine={false}
      axisLine={false}
      tickMargin={4}
      ticks={yTicks}
      domain={[yTicks[0], yTicks[yTicks.length - 1]]}
      tickFormatter={(v: number) => format.compact(v)}
    />,
    <Tooltip
      key="tooltip"
      cursor={
        isBar
          ? { fill: 'hsl(var(--muted))', opacity: 0.6 }
          : {
              stroke: 'hsl(var(--muted-foreground))',
              strokeOpacity: 0.4,
              strokeWidth: 1,
            }
      }
      content={
        <ChartTooltipContent
          format={format.full}
          colors={colors}
          showTotal={stacked}
        />
      }
    />,
  ];
  const margin = { top: 8, right: narrow ? 4 : 8, bottom: 0, left: 0 };
  const singlePoint = categories.length === 1;
  const activeDot = { r: 4, strokeWidth: 2, stroke: SURFACE_COLOR };

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
            activeDot={activeDot}
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
            activeDot={activeDot}
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
      <BarChart data={rows} margin={margin} barGap={2} barCategoryGap="24%">
        {chrome}
        {series.map((s, i) => (
          <Bar
            key={s.name}
            dataKey={s.name}
            name={seriesLabel(s.name)}
            stackId={stackId}
            fill={colorOf(s)}
            maxBarSize={narrow ? 20 : 28}
            radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : 0}
            stroke={stacked ? SURFACE_COLOR : undefined}
            strokeWidth={stacked ? 1 : 0}
            animationDuration={ANIMATION_MS}
          />
        ))}
      </BarChart>
    );
  }

  return (
    <div
      ref={frameRef}
      className={cn(
        'flex w-full min-w-0 flex-col gap-2',
        fill ? 'h-full min-h-0' : 'h-72'
      )}
    >
      {series.length > 1 && (
        <SeriesLegend
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
}

function SeriesLegend({
  items,
  line,
}: {
  items: { name: string; color: string }[];
  line: boolean;
}) {
  return (
    <ul
      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1"
      aria-hidden
    >
      {items.map((item) => (
        <li
          key={item.name}
          className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span
            className={cn(
              'shrink-0',
              line ? 'h-0.5 w-3 rounded-full' : 'h-2.5 w-2.5 rounded-sm'
            )}
            style={{ background: item.color }}
          />
          <span className="max-w-[10rem] truncate">{item.name}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Y ticks from the data extent, always including the zero baseline. A stack's
 * extent is its per-category positive / negative sums, not single values.
 */
function yAxisTicks(
  series: Series[],
  categoryCount: number,
  stacked: boolean
): number[] {
  let min = 0;
  let max = 0;
  for (let i = 0; i < categoryCount; i++) {
    let up = 0;
    let down = 0;
    for (const s of series) {
      const v = s.data[i] ?? 0;
      if (stacked) {
        if (v > 0) up += v;
        else down += v;
      } else {
        up = Math.max(up, v);
        down = Math.min(down, v);
      }
    }
    max = Math.max(max, up);
    min = Math.min(min, down);
  }
  return niceTicks(min, max);
}

const OTHER_NAME = 'Other';
type FoldedSeries = Series & { folded?: boolean };

/**
 * Past the 8 categorical slots, the smallest series fold into one neutral
 * "Other" series rather than cycling colours (two series would share a hue).
 * Only additive measures can be summed; anything else keeps every series.
 */
function foldSeries(
  series: Series[],
  categoryCount: number,
  aggregation: string | undefined
): FoldedSeries[] {
  if (series.length <= SERIES_SLOTS) return series;
  if (aggregation && aggregation !== 'sum' && aggregation !== 'count')
    return series;
  const total = (s: Series) =>
    s.data.reduce<number>((sum, v) => sum + Math.abs(v ?? 0), 0);
  const ranked = [...series].sort((a, b) => total(b) - total(a));
  const keep = new Set(ranked.slice(0, SERIES_SLOTS - 1));
  const rest = ranked.slice(SERIES_SLOTS - 1);
  const other: FoldedSeries = {
    name: OTHER_NAME,
    folded: true,
    data: Array.from({ length: categoryCount }, (_, i) =>
      rest.reduce<number>((sum, s) => sum + (s.data[i] ?? 0), 0)
    ),
  };
  // Kept series stay in their original order so colour follows the entity.
  return [...series.filter((s) => keep.has(s)), other];
}
