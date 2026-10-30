'use client';

// Pie / donut renderer. Slices run largest-first from 12 o'clock; past 5
// slices the tail folds into a neutral "Other" (chart-rest). The legend beside
// the chart is a real list (name, value, share) and doubles as its text
// equivalent; hovering a row or slice dims the rest.

import { arc, pie as d3Pie } from 'd3-shape';
import { forwardRef, useId, useState } from 'react';

import { cn } from '@/components/ds/cn';
import { Text } from '@/components/ds/Text/Text';
import { seriesLabel } from '@/lib/charts/chart-series';
import { useElementSize } from '@/lib/charts/useElementSize';
import { formatPercent } from '@/lib/format';

import type { ChartEntry, ChartInput } from './Chart';
import { ChartFloat } from './ChartFloat';
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
import { useMergedRef } from './mergeRefs';
import { useReveal } from './useReveal';

/** Below this width the legend stacks under the pie instead of beside it. */
const STACK_BELOW_PX = 360;

/** A slice's share of the pie: whole percent, "<1%" for slivers. */
function shareText(ratio: number): string {
  const pct = ratio * 100;
  return pct > 0 && pct < 1 ? '<1%' : formatPercent(pct, { decimals: 0 });
}

interface Slice {
  name: string;
  value: number;
  color: string;
  /** The category's index in `data.categories`. */
  index?: number;
  /** Names folded into an "Other" slice. */
  folded?: string[];
}

/** Share of the half-size the ring reaches out to, and where a donut's hole starts (of that radius). */
const OUTER_RATIO = 0.93;
const HOLE_RATIO = 0.64;
const DONUT_CORNER = 4;

/** The mask that reveals the ring: a stroke sweeping round from 12 o'clock. Mounts with the SVG, so the sweep plays on the first painted frame. */
function SweepCircle({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const revealed = useReveal();
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r / 2}
      fill="none"
      stroke="white"
      strokeWidth={r}
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={revealed ? 0 : 1}
      transform={`rotate(-90 ${cx} ${cy})`}
      className="transition-all duration-slow ease-out motion-reduce:transition-none"
    />
  );
}

/** The pie's SVG: measures its own box, so a stacked (phone) layout can size it by CSS alone. */
function PieSvg({
  slices,
  donut,
  active,
  onActive,
  pressable,
  press,
  tooltip,
}: {
  slices: Slice[];
  donut: boolean;
  active: number | null;
  onActive: (i: number | null) => void;
  pressable: (s: Slice) => boolean;
  press: (s: Slice) => void;
  /** Hover card for a slice (plain pie only); absent = none. */
  tooltip?: (s: Slice) => React.ReactNode;
}) {
  const uid = useId().replace(/:/g, '');
  const [boxRef, { width, height }] = useElementSize<HTMLDivElement>();
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const radius = (Math.min(width, height) / 2) * OUTER_RATIO;
  const arcs = d3Pie<Slice>()
    .sort(null)
    .value((s) => s.value)(slices);
  const ring = arc<(typeof arcs)[number]>()
    .innerRadius(donut ? radius * HOLE_RATIO : 0)
    .outerRadius(radius)
    .cornerRadius(donut ? DONUT_CORNER : 0);
  const track = (e: React.MouseEvent<SVGElement>) => {
    const box = svgBox(e.currentTarget);
    setPointer({ x: e.clientX - box.left, y: e.clientY - box.top });
  };
  const maskId = `${uid}-sweep`;
  const hovered = active !== null ? slices[active] : null;

  return (
    <div ref={boxRef} className="absolute inset-0">
      {width > 0 && height > 0 && (
        <svg width={width} height={height} data-chart="pie" className="block overflow-visible">
          <defs>
            {/* The ring is revealed by a stroke that sweeps round from 12 o'clock. */}
            <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
              <SweepCircle cx={width / 2} cy={height / 2} r={radius} />
            </mask>
          </defs>
          <g mask={`url(#${maskId})`}>
            <g transform={`translate(${width / 2} ${height / 2})`}>
            {arcs.map((a, i) => (
              <path
                key={a.data.name}
                d={ring(a) ?? ''}
                data-slice={i}
                fill={a.data.color}
                fillOpacity={active === null || active === i ? 1 : 0.35}
                stroke={CHART_SURFACE_COLOR}
                strokeWidth={2}
                className={pressable(a.data) ? 'cursor-pointer active:opacity-80' : undefined}
                onMouseEnter={(e) => {
                  onActive(i);
                  track(e);
                }}
                onMouseLeave={() => {
                  onActive(null);
                  setPointer(null);
                }}
                onPointerMove={track}
                onPointerDown={(e) => {
                  // A stationary touch tap has no move: it still opens the card.
                  onActive(i);
                  track(e);
                }}
                onClick={() => press(a.data)}
              />
            ))}
            </g>
          </g>
        </svg>
      )}
      {tooltip && hovered && pointer && (
        <ChartFloat x={pointer.x} y={pointer.y} width={width} height={height}>
          {tooltip(hovered)}
        </ChartFloat>
      )}
    </div>
  );
}

/** The bounding box of the SVG a mark sits in (pointer coordinates are relative to it). */
function svgBox(el: SVGElement) {
  return (el.ownerSVGElement ?? el).getBoundingClientRect();
}

export interface ChartPieProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  data: ChartInput;
  fill?: boolean;
  money: boolean;
  donut: boolean;
  onSelectEntry?: (entry: ChartEntry) => void;
  canSelectEntry?: (entry: ChartEntry) => boolean;
}

export const ChartPie = forwardRef<HTMLDivElement, ChartPieProps>(function ChartPie(
  {
  data,
  fill,
  money,
  donut,
  onSelectEntry,
  canSelectEntry,
  className,
  ...props
},
  ref,
) {
  const [sizeRef, { width, height }] = useElementSize<HTMLDivElement>();
  const frameRef = useMergedRef(sizeRef, ref);
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
            : 'aspect-video desk:aspect-wide',
        className
      )}
      {...props}
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
          <PieSvg
            slices={slices}
            donut={donut}
            active={active}
            onActive={setActive}
            pressable={pressable}
            press={press}
            tooltip={
              donut
                ? undefined
                : (s) => (
                    <ChartTooltip
                      active
                      payload={[{ name: s.name, value: s.value, color: s.color }]}
                      format={format.full}
                      colors={colors}
                    />
                  )
            }
          />
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
                    {shareText(s.value / total)}
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
});
