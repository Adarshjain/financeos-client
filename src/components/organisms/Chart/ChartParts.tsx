'use client';

import { forwardRef, type ReactNode } from 'react';

import { Card, cn, Text } from '@/components/ds';
import type { ChartData } from '@/lib/reports.types';

/** Colour key for a series: a short stroke for lines, a small square otherwise. Drawn as SVG so any CSS colour works. */
export function ChartSwatch({
  line,
  color,
}: {
  line: boolean;
  color?: string;
}) {
  return line ? (
    <svg
      aria-hidden
      viewBox="0 0 12 2"
      preserveAspectRatio="none"
      className="h-space-2 w-space-12 shrink-0"
    >
      <rect width="12" height="2" rx="1" fill={color} />
    </svg>
  ) : (
    <svg aria-hidden viewBox="0 0 10 10" className="size-icon-xs shrink-0">
      <rect width="10" height="10" rx="2" fill={color} />
    </svg>
  );
}

interface TooltipItem {
  name?: string | number;
  value?: unknown;
  color?: string;
  dataKey?: unknown;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<TooltipItem>;
  label?: string | number;
  format: (value: number) => string;
  /** Explicit colour per series name; falls back to what Recharts reports. */
  colors?: Record<string, string>;
  /** Adds a "Total" row (stacked bars). */
  showTotal?: boolean;
}

/** Hover card shared by every chart. Pass it as an element to Recharts' Tooltip, which injects active, payload and label. */
export function ChartTooltip({
  active,
  payload,
  label,
  format,
  colors,
  showTotal,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => typeof p.value === 'number');
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, p) => sum + (p.value as number), 0);
  return (
    <Card variant="inset">
      <div className="flex flex-col gap-space-6 px-space-10 py-space-8">
      {label !== undefined && label !== '' && (
        <Text variant="label">{label}</Text>
      )}
      {rows.map((p) => {
        const name = String(p.name ?? p.dataKey ?? '');
        return (
          <div key={name} className="flex items-center gap-space-8">
            <ChartSwatch line color={colors?.[name] ?? p.color} />
            <Text variant="caption" tone="ink-3" truncate className="flex-1">
              {name}
            </Text>
            <Text variant="label">
              {format(p.value as number)}
            </Text>
          </div>
        );
      })}
      {showTotal && rows.length > 1 && (
        <div className="flex items-center justify-between gap-space-8 border-t border-line pt-space-6">
          <Text variant="caption" tone="ink-3">
            Total
          </Text>
          <Text variant="label">
            {format(total)}
          </Text>
        </div>
      )}
      </div>
    </Card>
  );
}

/** Series legend above a cartesian chart: one swatch (a stroke for lines) and a name per series. */
export function ChartLegend({
  items,
  line,
}: {
  items: { name: string; color: string }[];
  line: boolean;
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-space-16 gap-y-space-4 px-space-4">
      {items.map((item) => (
        <li key={item.name} className="flex min-w-0 items-center gap-space-6">
          <ChartSwatch line={line} color={item.color} />
          <Text
            variant="caption"
            tone="ink-3"
            truncate
            className="max-w-space-96"
          >
            {item.name}
          </Text>
        </li>
      ))}
    </ul>
  );
}

/** Text equivalent of the SVG: the chart's data in a visually hidden table. */
export function ChartDataTable({
  data,
}: {
  data: Pick<ChartData, 'categories' | 'series'>;
}): ReactNode {
  const { categories, series } = data;
  return (
    <table className="sr-only">
      <caption>Chart data</caption>
      <thead>
        <tr>
          <th scope="col">Category</th>
          {series.map((s) => (
            <th key={s.name} scope="col">
              {s.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {categories.map((category, i) => (
          <tr key={category}>
            <th scope="row">{category}</th>
            {series.map((s) => (
              <td key={s.name}>{s.data[i] ?? '—'}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Shown when there is nothing to draw. */
export const ChartEmpty = forwardRef<HTMLElement, Omit<React.HTMLAttributes<HTMLElement>, 'children'>>(function ChartEmpty(
  { className, ...props },
  ref,
) {
  return (
    <Text
      ref={ref}
      {...props}
      as="p"
      variant="body"
      tone="ink-3"
      align="center"
      className={cn('py-space-32', className)}
    >
      No data for this configuration.
    </Text>
  );
});
