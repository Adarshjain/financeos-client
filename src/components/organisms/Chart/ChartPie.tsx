'use client';

// Pie / donut renderer. Slices run largest-first from 12 o'clock; past 5
// slices the tail folds into a neutral "Other" (chart-rest). The legend beside
// the chart is a real list (name, value, share) and doubles as its text
// equivalent; hovering a row or slice dims the rest.

import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { Text } from '@/components/ds';
import { cn } from '@/components/ds/cn';
import { formatShare, seriesLabel } from '@/lib/charts/chart-series';
import { useElementSize } from '@/lib/charts/useElementSize';

import type { ChartEntry, ChartInput } from './Chart';
import {
  ChartDataTable,
  ChartEmpty,
  ChartSwatch,
  ChartTooltip,
} from './ChartParts';
import {
  CHART_REST_COLOR,
  CHART_SLOTS,
  CHART_SURFACE_COLOR,
  chartColor,
} from './chartTokens';
import { chartValueFormat } from './chartValueFormat';

/** Below this width the legend stacks under the pie instead of beside it. */
const STACK_BELOW_PX = 360;

interface Slice {
  name: string;
  value: number;
  color: string;
  /** The category's index in `data.categories`. */
  index?: number;
  /** Names folded into an "Other" slice. */
  folded?: string[];
}

export function ChartPie({
  data,
  fill,
  money,
  donut,
  onSelectEntry,
  canSelectEntry,
}: {
  data: ChartInput;
  fill?: boolean;
  money: boolean;
  donut: boolean;
  onSelectEntry?: (entry: ChartEntry) => void;
  canSelectEntry?: (entry: ChartEntry) => boolean;
}) {
  const [frameRef, { width, height }] = useElementSize<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const format = chartValueFormat(money);

  const first = data.series[0];
  const all = data.categories.map((name, i) => ({
    name,
    value: first.data[i] ?? 0,
    index: i,
  }));
  // A pie can only show parts of a whole: zero/negative values have no slice.
  const positive = all
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
  if (positive.length === 0) {
    return (
      <ChartEmpty />
    );
  }

  const slices: Slice[] = positive
    .slice(0, positive.length > CHART_SLOTS ? CHART_SLOTS - 1 : CHART_SLOTS)
    .map((s, i) => ({ ...s, color: chartColor(i) }));
  if (positive.length > CHART_SLOTS) {
    const rest = positive.slice(CHART_SLOTS - 1);
    slices.push({
      name: 'Other',
      value: rest.reduce((sum, s) => sum + s.value, 0),
      color: CHART_REST_COLOR,
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
  const entryOf = (s: Slice): ChartEntry => ({
    key: s.name,
    label: s.folded ? `Other (${s.folded.length})` : s.name,
    seriesKey: seriesLabel(first.name),
    value: s.value,
    index: s.folded ? undefined : s.index,
  });
  const pressable = (s: Slice) =>
    !!onSelectEntry && (canSelectEntry?.(entryOf(s)) ?? true);
  const press = (s: Slice) => {
    if (pressable(s)) onSelectEntry?.(entryOf(s));
  };
  const focus = active !== null ? slices[active] : null;

  return (
    <div
      ref={frameRef}
      className={cn(
        'flex w-full min-w-0',
        stacked ? 'flex-col gap-space-8 desk:gap-space-12' : 'items-center gap-space-24',
        fill
          ? 'h-full min-h-0'
          : stacked
            ? ''
            : 'aspect-video desk:aspect-wide'
      )}
    >
      {!legendCoversAll && <ChartDataTable data={data} />}
      <div
        className={cn(
          'relative shrink-0',
          stacked && (fill ? 'min-h-space-96 w-full flex-1' : 'aspect-video w-full')
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
                stroke={CHART_SURFACE_COLOR}
                strokeWidth={2}
                animationDuration={450}
                onMouseEnter={(_, i) => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onClick={
                  onSelectEntry
                    ? (_, i) => press(slices[i])
                    : undefined
                }
              >
                {slices.map((s, i) => (
                  <Cell
                    key={s.name}
                    fill={s.color}
                    className={
                      pressable(s) ? 'cursor-pointer active:opacity-80' : undefined
                    }
                    fillOpacity={active === null || active === i ? 1 : 0.35}
                  />
                ))}
              </Pie>
              {!donut && (
                <Tooltip
                  content={
                    <ChartTooltip format={format.full} colors={colors} />
                  }
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        )}
        {measured && donut && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
          >
            <div className="flex w-7/12 flex-col items-center">
              <Text variant="micro" tone="ink-3" truncate className="w-full">
                {focus ? focus.name : 'Total'}
              </Text>
              <Text variant="heading">
                {format.compact(focus ? focus.value : total)}
              </Text>
            </div>
          </div>
        )}
      </div>

      <ul
        aria-label="Chart data"
        className={cn(
          'flex min-w-0 flex-col gap-space-2',
          stacked
            ? fill
              ? 'min-h-0 shrink overflow-y-auto'
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
              'transition-opacity',
              active !== null && active !== i && 'opacity-50'
            )}
          >
            {(() => {
              const content = (
                <>
                  <ChartSwatch line={false} color={s.color} />
                  <Text
                    variant="caption"
                    tone="ink-3"
                    truncate
                    className="min-w-0 flex-1 text-start"
                  >
                    {s.folded ? `Other (${s.folded.length})` : s.name}
                  </Text>
                  <Text variant="label">{format.full(s.value)}</Text>
                  <Text
                    variant="micro"
                    tone="ink-3"
                    align="end"
                    className="w-space-32"
                  >
                    {formatShare(s.value / total)}
                  </Text>
                </>
              );
              const rowClass =
                'flex w-full items-center gap-space-8 rounded-ds-sm px-space-8 py-space-4';
              return pressable(s) ? (
                <button
                  type="button"
                  onClick={() => press(s)}
                  className={cn(
                    rowClass,
                    'cursor-pointer hover:bg-hover active:bg-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset'
                  )}
                >
                  {content}
                </button>
              ) : (
                <div className={rowClass}>{content}</div>
              );
            })()}
          </li>
        ))}
      </ul>
    </div>
  );
}
