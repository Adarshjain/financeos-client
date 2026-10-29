'use client';

// Sparkline: one series as a small area trend with no axes, grid, legend or
// tooltip. Fills its container's width at a fixed small height; chart-1.

import { forwardRef, useId } from 'react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';

import { cn } from '@/components/ds/cn';

import type { ChartInput } from './Chart';
import { ChartDataTable } from './ChartParts';
import { chartColor } from './chartTokens';

/** Room so the 2px stroke is not clipped at the edges. */
const [top, right, bottom, left] = [2, 2, 2, 2];
const MARGIN = { top, right, bottom, left };

export interface ChartSparklineProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  data: ChartInput;
}

export const ChartSparkline = forwardRef<HTMLDivElement, ChartSparklineProps>(function ChartSparkline(
  { data, className, ...props },
  ref,
) {
  const gradientId = useId().replace(/:/g, '');
  const first = data.series[0];
  const color = chartColor(0);
  const rows = data.categories.map((category, i) => ({
    category,
    value: first.data[i] ?? null,
  }));
  return (
    <div ref={ref} className={cn('h-space-48 w-full min-w-0', className)} {...props}>
      <ChartDataTable data={{ categories: data.categories, series: [first] }} />
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={MARGIN}>
          <defs>
            <linearGradient
              id={gradientId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            fillOpacity={1}
            dot={false}
            activeDot={false}
            connectNulls
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
