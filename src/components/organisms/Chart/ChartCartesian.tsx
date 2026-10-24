'use client';

// Cartesian renderer (line, area, bar, stackedBar) over Recharts, styled with
// Dinero tokens: series in chart-1…chart-5 (the rest fold into chart-rest),
// recessive axes, a hairline horizontal grid and compact ₹1.2L ticks.

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

import { cn } from '@/components/ds/cn';
import { truncateLabel, valueFormat } from '@/lib/charts/chart-format';
import {
  type FoldedSeries,
  foldSeries,
  seriesLabel,
  yAxisTicks,
} from '@/lib/charts/chart-series';
import { useElementSize } from '@/lib/charts/useElementSize';

import type { ChartInput } from './Chart';
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

type ChartRow = Record<string, string | number | null>;

const NARROW_PX = 400;
const ANIMATION_MS = 450;

export function ChartCartesian({
  data,
  fill,
  money,
  yDomain,
}: {
  data: ChartInput;
  fill?: boolean;
  money: boolean;
  yDomain?: 'zero' | 'data';
}) {
  const { chartType, categories } = data;
  const gradientId = useId().replace(/:/g, '');
  const [frameRef, { width }] = useElementSize<HTMLDivElement>();
  const narrow = width > 0 && width < NARROW_PX;
  const format = valueFormat(money);

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
    chartType === 'stackedBar',
    yDomain !== 'data'
  );
  const tick = { fontSize, fill: CHART_AXIS_COLOR };
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
      stroke={CHART_GRID_COLOR}
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
  const margin = { ...CHART_MARGIN, right: narrow ? 4 : 8 };
  const singlePoint = categories.length === 1;
  const activeDot = { r: 4, strokeWidth: 2, stroke: CHART_SURFACE_COLOR };

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
            stroke={stacked ? CHART_SURFACE_COLOR : undefined}
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
        'flex w-full min-w-0 flex-col gap-space-8',
        fill ? 'h-full min-h-0' : 'aspect-video desk:aspect-wide'
      )}
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
}
