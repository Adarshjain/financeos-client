'use client';

// Pie / donut renderer for ChartView, plus the screen-reader data table and
// series-label helper both chart shapes share. Slices run largest-first from
// 12 o'clock; past 8 slices the tail folds into a neutral "Other". The legend
// beside the chart is a real list (name, value, share) and doubles as the
// chart's text equivalent; hovering a row or slice dims the rest.

import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import {
  OTHER_COLOR,
  SERIES_SLOTS,
  seriesColor,
  SURFACE_COLOR,
  valueFormat,
} from '@/components/charts/chart-format';
import { ChartTooltipContent } from '@/components/charts/ChartTooltip';
import { useElementSize } from '@/components/charts/useElementSize';
import { cn } from '@/lib/utils';

import type { ChartViewData } from './ChartView';

/** Below this width the legend stacks under the pie instead of beside it. */
const STACK_BELOW_PX = 360;

interface Slice {
  name: string;
  value: number;
  color: string;
  /** Names folded into an "Other" slice. */
  folded?: string[];
}

export function ChartPieView({
  data,
  fill,
  money,
  donut,
}: {
  data: ChartViewData;
  fill?: boolean;
  money: boolean;
  donut: boolean;
}) {
  const [frameRef, { width, height }] = useElementSize<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const format = valueFormat(money);

  const first = data.series[0];
  const all = data.categories.map((name, i) => ({
    name,
    value: first.data[i] ?? 0,
  }));
  // A pie can only show parts of a whole: zero/negative values have no slice.
  const positive = all
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
  if (positive.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        No data for this configuration.
      </p>
    );
  }

  const slices: Slice[] = positive
    .slice(0, positive.length > SERIES_SLOTS ? SERIES_SLOTS - 1 : SERIES_SLOTS)
    .map((s, i) => ({ ...s, color: seriesColor(i) }));
  if (positive.length > SERIES_SLOTS) {
    const rest = positive.slice(SERIES_SLOTS - 1);
    slices.push({
      name: 'Other',
      value: rest.reduce((sum, s) => sum + s.value, 0),
      color: OTHER_COLOR,
      folded: rest.map((s) => s.name),
    });
  }
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const colors = Object.fromEntries(slices.map((s) => [s.name, s.color]));
  // The legend is the text equivalent unless some categories aren't in it.
  const legendCoversAll = slices.length === all.length;
  // The pie is sized from the measured frame, never from its own content —
  // an intrinsically-sized pie would widen a narrow parent and defeat the
  // stacked (phone) layout. Until measured (first frame, jsdom) only the
  // legend renders.
  const measured = width > 0;
  const stacked = measured && width < STACK_BELOW_PX;
  const pieSize = Math.floor(Math.min(height, width * 0.45));
  const focus = active !== null ? slices[active] : null;

  return (
    <div
      ref={frameRef}
      className={cn(
        'flex w-full min-w-0',
        stacked ? 'flex-col gap-3' : 'items-center gap-6',
        fill ? 'h-full min-h-0' : stacked ? '' : 'h-72'
      )}
    >
      {!legendCoversAll && <ChartDataTable data={data} />}
      <div
        className={cn(
          'relative shrink-0',
          stacked && (fill ? 'min-h-[8rem] w-full flex-1' : 'h-52 w-full')
        )}
        style={
          stacked ? undefined : { width: pieSize || 0, height: pieSize || 0 }
        }
      >
        {measured && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                startAngle={90}
                endAngle={-270}
                outerRadius="96%"
                innerRadius={donut ? '64%' : 0}
                cornerRadius={donut ? 4 : 0}
                stroke={SURFACE_COLOR}
                strokeWidth={2}
                animationDuration={450}
                onMouseEnter={(_, i) => setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                {slices.map((s, i) => (
                  <Cell
                    key={s.name}
                    fill={s.color}
                    fillOpacity={active === null || active === i ? 1 : 0.35}
                  />
                ))}
              </Pie>
              {!donut && (
                <Tooltip
                  content={
                    <ChartTooltipContent format={format.full} colors={colors} />
                  }
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        )}
        {measured && donut && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[22%] text-center"
          >
            <span className="w-full truncate text-2xs text-muted-foreground">
              {focus ? focus.name : 'Total'}
            </span>
            <span className="text-base font-semibold tabular-nums text-foreground">
              {format.compact(focus ? focus.value : total)}
            </span>
          </div>
        )}
      </div>

      <ul
        aria-label="Chart data"
        className={cn(
          'min-w-0 space-y-0.5',
          stacked
            ? fill
              ? 'max-h-[45%] shrink-0 overflow-y-auto'
              : ''
            : 'max-h-full flex-1 overflow-y-auto'
        )}
      >
        {slices.map((s, i) => (
          <li
            key={s.name}
            title={s.folded ? s.folded.join(', ') : undefined}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-opacity',
              active !== null && active !== i && 'opacity-50'
            )}
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {s.folded ? `Other (${s.folded.length})` : s.name}
            </span>
            <span className="font-medium tabular-nums text-foreground">
              {format.full(s.value)}
            </span>
            <span className="w-10 text-right text-2xs tabular-nums text-muted-foreground">
              {formatShare(s.value / total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatShare(ratio: number): string {
  const pct = ratio * 100;
  return pct > 0 && pct < 1 ? '<1%' : `${Math.round(pct)}%`;
}

export function ChartDataTable({ data }: { data: ChartViewData }) {
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

/** Legend/tooltip label for a series keyed by its measure field, e.g. "spend" -> "Spend". */
export function seriesLabel(name: string): string {
  return name.length ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}
