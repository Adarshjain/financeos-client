'use client';

import { isMoneyField, labelChartData } from '@/lib/reports.helpers';
import type { BreakdownBars, BreakdownColumn, ChartData } from '@/lib/reports.types';

import { ChartBreakdown } from './ChartBreakdown';
import { ChartCartesian } from './ChartCartesian';
import { ChartHeatmap } from './ChartHeatmap';
import { ChartEmpty } from './ChartParts';
import { ChartPie } from './ChartPie';
import { ChartSparkline } from './ChartSparkline';

/** A report's chart data: categories and series aligned by index, plus the chart type. */
export type ChartInput = Pick<ChartData, 'categories' | 'series'> &
  Partial<Omit<ChartData, 'chartType'>> & {
    chartType: ChartData['chartType'] | 'sparkline' | 'heatmap';
  };

/** What a press on a bar, point, slice (or its legend row) or heatmap cell reports. */
export interface ChartEntry {
  /** The category (bar, point, slice) or the day as YYYY-MM-DD (heatmap cell). */
  key: string;
  /** What the user reads for it: the category label, or the day as dd/mm/yyyy. */
  label: string;
  /** The series label for a bar or point; absent for a slice or a heatmap cell. */
  seriesKey?: string;
  value: number;
}

export interface ChartProps {
  /** What to draw; `chartType` picks line, bar, stackedBar, area, pie or donut. */
  data: ChartInput;
  /** Fill the parent's height (a fixed-height card) instead of the default 16:9 frame (21:9 from `desk`). */
  fill?: boolean;
  /** Cartesian value axis: `zero` (default) always includes 0, `data` fits the axis to the data range. */
  yDomain?: 'zero' | 'data';
  /** Whether values are money. Given, it wins; omitted, a measure named like an amount is money (and a count never is). */
  money?: boolean;
  /** Breakdown only: the value columns, in the order they are drawn; absent = amount, share, and change when the data compares. */
  columns?: BreakdownColumn[];
  /** Breakdown only: what the bars are relative to; absent = the largest row. */
  bars?: BreakdownBars;
  /** Breakdown only: an increase reads good when true, bad when false, neutral when unset. */
  higherIsBetter?: boolean;
  /** Breakdown only: the heading of the label column (the rows' dimension); default "Category". */
  rowsLabel?: string;
  /** Breakdown only: a press on row `index` (the index into `data.categories`) opens its underlying data. */
  onOpenRow?: (index: number) => void;
  /** A press on a cartesian bar or point, a pie/donut slice or its legend row, or a heatmap cell; absent = nothing is pressable. */
  onSelectEntry?: (entry: ChartEntry) => void;
  /** Heatmap only: how many months the calendar covers (default 6). */
  months?: number;
  /** Breakdown only: whether row `index` can open underlying data; without it every row can. */
  canOpenRow?: (index: number) => boolean;
}

/**
 * A report chart over Recharts, drawn in Dinero tokens: series in chart-1…chart-5 (the rest fold into
 * "Other" in chart-rest), a legend, a hover card and a hidden data table as the text equivalent.
 */
export function Chart({
  data: raw,
  fill,
  yDomain,
  money: moneyProp,
  columns,
  bars,
  higherIsBetter,
  rowsLabel,
  onOpenRow,
  canOpenRow,
  onSelectEntry,
  months,
}: ChartProps) {
  if (raw.chartType === 'breakdown') {
    return (
      <ChartBreakdown
        data={raw}
        money={moneyProp}
        columns={columns}
        bars={bars}
        higherIsBetter={higherIsBetter}
        rowsLabel={rowsLabel}
        onOpenRow={onOpenRow}
        canOpenRow={canOpenRow}
      />
    );
  }
  // Static enum categories/series read as their labels (e.g. "Bank account").
  const data = labelChartData(raw);
  const { chartType, categories, series } = data;

  if (categories.length === 0 || series.length === 0) return <ChartEmpty />;

  const money =
    moneyProp ??
    (!!data.measure &&
      data.measure.aggregation !== 'count' &&
      isMoneyField(data.measure.field));

  if (chartType === 'sparkline') {
    return <ChartSparkline data={data} />;
  }
  if (chartType === 'heatmap') {
    return (
      <ChartHeatmap
        data={data}
        money={money}
        months={months}
        onSelectEntry={onSelectEntry}
      />
    );
  }
  if (chartType === 'pie' || chartType === 'donut') {
    return (
      <ChartPie
        data={data}
        fill={fill}
        money={money}
        donut={chartType === 'donut'}
        onSelectEntry={onSelectEntry}
      />
    );
  }
  return (
    <ChartCartesian
      data={data}
      fill={fill}
      money={money}
      yDomain={yDomain}
      onSelectEntry={onSelectEntry}
    />
  );
}
