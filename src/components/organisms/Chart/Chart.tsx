'use client';

import { isMoneyField, labelChartData } from '@/lib/reports.helpers';
import type { ChartData } from '@/lib/reports.types';

import { ChartCartesian } from './ChartCartesian';
import { ChartEmpty } from './ChartParts';
import { ChartPie } from './ChartPie';

/** A report's chart data: categories and series aligned by index, plus the chart type. */
export type ChartInput = Pick<
  ChartData,
  'chartType' | 'categories' | 'series'
> &
  Partial<ChartData>;

export interface ChartProps {
  /** What to draw; `chartType` picks line, bar, stackedBar, area, pie or donut. */
  data: ChartInput;
  /** Fill the parent's height (a fixed-height card) instead of the default 16:9 frame (21:9 from `desk`). */
  fill?: boolean;
  /** Cartesian value axis: `zero` (default) always includes 0, `data` fits the axis to the data range. */
  yDomain?: 'zero' | 'data';
  /** Whether values are money. Given, it wins; omitted, a measure named like an amount is money (and a count never is). */
  money?: boolean;
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
}: ChartProps) {
  // Static enum categories/series read as their labels (e.g. "Bank account").
  const data = labelChartData(raw);
  const { chartType, categories, series } = data;

  if (categories.length === 0 || series.length === 0) return <ChartEmpty />;

  const money =
    moneyProp ??
    (!!data.measure &&
      data.measure.aggregation !== 'count' &&
      isMoneyField(data.measure.field));

  if (chartType === 'pie' || chartType === 'donut') {
    return (
      <ChartPie
        data={data}
        fill={fill}
        money={money}
        donut={chartType === 'donut'}
      />
    );
  }
  return (
    <ChartCartesian
      data={data}
      fill={fill}
      money={money}
      yDomain={yDomain}
    />
  );
}
