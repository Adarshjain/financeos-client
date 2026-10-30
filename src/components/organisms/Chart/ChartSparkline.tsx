'use client';

// Sparkline: one series as a small area trend with no axes, grid, legend or
// tooltip. Fills its container's width at a fixed small height; chart-1.

import { scaleLinear, scalePoint } from 'd3-scale';
import { forwardRef, useId } from 'react';

import { cn } from '@/components/ds/cn';
import { useElementSize } from '@/lib/charts/useElementSize';

import type { ChartInput } from './Chart';
import { areaPath, linePath, type Point } from './chartGeometry';
import { ChartDataTable } from './ChartParts';
import { chartColor } from './chartTokens';
import { useMergedRef } from './mergeRefs';

/** Room so the 2px stroke is not clipped at the edges. */
const PAD = 2;

export interface ChartSparklineProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  data: ChartInput;
}

export const ChartSparkline = forwardRef<HTMLDivElement, ChartSparklineProps>(function ChartSparkline(
  { data, className, ...props },
  ref,
) {
  const gradientId = useId().replace(/:/g, '');
  const [sizeRef, { width, height }] = useElementSize<HTMLDivElement>();
  const frameRef = useMergedRef(sizeRef, ref);
  const first = data.series[0];
  const color = chartColor(0);

  const values = data.categories.map((_, i) => first.data[i] ?? null);
  const present = values.filter((v): v is number => v !== null);
  const [min, max] = [Math.min(...present), Math.max(...present)];
  const x = scalePoint<number>()
    .domain(values.map((_, i) => i))
    .range([PAD, width - PAD]);
  // Fits the data extent; a flat series sits mid-height.
  const y = scaleLinear().domain([min, max]).range([height - PAD, PAD]);
  const points: Point[] = [];
  values.forEach((v, i) => {
    if (v !== null) points.push([x(i) ?? 0, max === min ? height / 2 : y(v)]);
  });

  return (
    <div ref={frameRef} className={cn('h-space-48 w-full min-w-0', className)} {...props}>
      <ChartDataTable data={{ categories: data.categories, series: [first] }} />
      {width > 0 && height > 0 && points.length > 1 && (
        <svg width={width} height={height} className="block">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <path d={areaPath(points, height - PAD)} fill={`url(#${gradientId})`} stroke="none" />
          <path d={linePath(points)} fill="none" stroke={color} strokeWidth={2} />
        </svg>
      )}
    </div>
  );
});
