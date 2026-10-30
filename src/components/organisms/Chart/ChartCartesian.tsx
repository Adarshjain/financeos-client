'use client';

// Cartesian renderer (line, area, bar, stackedBar): our own SVG on d3-scale and d3-shape, styled
// with Dinero tokens: series in chart-1…chart-5 (the rest fold into chart-rest), recessive axes,
// a hairline grid and compact ₹1.2L ticks. Hover (mouse) or tap (touch) opens the shared card.

import { scaleBand, scaleLinear, scalePoint } from 'd3-scale';
import { forwardRef, useEffect, useId, useRef, useState } from 'react';

import { cn } from '@/components/ds/cn';
import { truncateLabel } from '@/lib/charts/chart-format';
import {
  type FoldedSeries,
  foldSeries,
  seriesLabel,
  yAxisTicks,
} from '@/lib/charts/chart-series';
import { useElementSize } from '@/lib/charts/useElementSize';

import type { ChartEntry, ChartInput } from './Chart';
import { ChartFloat } from './ChartFloat';
import {
  areaPath,
  barLayout,
  barRadii,
  categoryIndexAt,
  linePath,
  type Point,
  roundedBarPath,
  stackSegments,
  textWidth,
  visibleTicks,
} from './chartGeometry';
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
import { chartValueFormat } from './chartValueFormat';
import { useReveal } from './useReveal';

const NARROW_PX = 400;
/** Past this many categories the bars stay upright (a long daily series is not a list). */
const MAX_HORIZONTAL_CATEGORIES = 10;
/** Room under the plot for the category labels. */
const X_AXIS_HEIGHT = 30;
/** Tick size (6) plus margin: the gap between a label and the plot edge. */
const AXIS_GAP = 10;
const BAR_RADIUS = 4;
const DOT_RADIUS = 4;

/** The clip that uncovers lines and areas left to right. Mounts with the SVG, so it starts closed on the first painted frame; a resize afterwards moves nothing. */
function RevealRect({ width, height }: { width: number; height: number }) {
  const revealed = useReveal();
  return (
    <rect
      x={0}
      y={0}
      width={width}
      height={height}
      className="transition-transform duration-slow ease-out motion-reduce:transition-none"
      style={{ transform: revealed ? 'scaleX(1)' : 'scaleX(0)', transformOrigin: '0 0' }}
    />
  );
}

export interface ChartCartesianProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  data: ChartInput;
  fill?: boolean;
  money: boolean;
  yDomain?: 'zero' | 'data';
  onSelectEntry?: (entry: ChartEntry) => void;
  canSelectEntry?: (entry: ChartEntry) => boolean;
}

interface Hover {
  index: number;
  x: number;
  y: number;
}

export const ChartCartesian = forwardRef<HTMLDivElement, ChartCartesianProps>(function ChartCartesian(
  { data, fill, money, yDomain, onSelectEntry, canSelectEntry, className, ...props },
  ref,
) {
  const { chartType, categories } = data;
  const uid = useId().replace(/:/g, '');
  const [plotRef, { width, height }] = useElementSize<HTMLDivElement>();
  const [hoverRaw, setHover] = useState<Hover | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const touching = useRef(false);
  // A refetch can shrink the categories under a hovered point: drop it then.
  const hover = hoverRaw && hoverRaw.index < categories.length ? hoverRaw : null;
  const narrow = width > 0 && width < NARROW_PX;
  const format = chartValueFormat(money);

  // A tap on touch keeps the card open until the next tap lands outside the chart.
  const open = !!hover;
  useEffect(() => {
    if (!open || !touching.current) return;
    const away = (e: PointerEvent) => {
      if (!svgRef.current?.contains(e.target as Node)) setHover(null);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const series = foldSeries(data.series, categories.length, data.measure?.aggregation, CHART_SLOTS);
  const colors: Record<string, string> = {};
  series.forEach((s, i) => {
    colors[seriesLabel(s.name)] = s.folded ? CHART_REST_COLOR : chartColor(i);
  });
  const colorOf = (s: FoldedSeries) => colors[seriesLabel(s.name)];

  const fontSize = narrow ? 10 : 12;
  const yTicks = yAxisTicks(series, categories.length, chartType === 'stackedBar', yDomain !== 'data');
  // A narrow range rounds neighbouring compact ticks to the same text; then every tick shows its full value.
  const compactTexts = yTicks.map((t) => format.compact(t));
  const valueTickText = (v: number) =>
    new Set(compactTexts).size === compactTexts.length ? format.compact(v) : format.full(v);
  // Room per category, in characters; ticks that still collide are skipped.
  const labelChars = width
    ? Math.max(8, Math.min(16, Math.floor(width / categories.length / (fontSize * 0.6))))
    : 12;
  const isBar = chartType !== 'line' && chartType !== 'area';
  const stacked = chartType === 'stackedBar';
  // A few categories whose names would not fit under their bars lie down: names on the left in full, bars run right.
  const longestLabel = categories.reduce((n, c) => Math.max(n, String(c).length), 0);
  const horizontal =
    isBar &&
    width > 0 &&
    categories.length > 1 &&
    categories.length <= MAX_HORIZONTAL_CATEGORIES &&
    longestLabel * fontSize * 0.6 > width / categories.length - 8;

  const entryOf = (s: FoldedSeries, i: number): ChartEntry | null =>
    i < 0 || i >= categories.length
      ? null
      : {
          key: categories[i],
          label: categories[i],
          seriesKey: seriesLabel(s.name),
          value: s.data[i] ?? 0,
          index: i,
        };
  const pressable = (s: FoldedSeries, i: number) => {
    const entry = entryOf(s, i);
    return !!onSelectEntry && !!entry && (canSelectEntry?.(entry) ?? true);
  };
  const pressEntry = (s: FoldedSeries, i: number) => {
    const entry = entryOf(s, i);
    if (entry && pressable(s, i)) onSelectEntry?.(entry);
  };

  // ── geometry ──
  const measured = width > 0 && height > 0;
  const margin = { ...CHART_MARGIN, right: narrow ? 4 : 8 };
  const domainMin = yTicks[0];
  const domainMax = yTicks[yTicks.length - 1];
  const nameWidth = Math.min(Math.ceil(textWidth('x'.repeat(longestLabel), fontSize)) + 4, Math.floor(width * 0.45));
  const yLabelWidth = Math.max(0, ...yTicks.map((t) => textWidth(valueTickText(t), fontSize))) + AXIS_GAP;
  const plot = {
    left: margin.left + (horizontal ? nameWidth : yLabelWidth),
    right: Math.max(0, width - margin.right),
    top: margin.top,
    bottom: Math.max(margin.top, height - margin.bottom - X_AXIS_HEIGHT),
  };
  const value = scaleLinear()
    .domain([domainMin, domainMax])
    .range(horizontal ? [plot.left, plot.right] : [plot.bottom, plot.top]);
  const indices = categories.map((_, i) => i);
  const band = scaleBand<number>()
    .domain(indices)
    .range(horizontal ? [plot.top, plot.bottom] : [plot.left, plot.right]);
  const point = scalePoint<number>().domain(indices).range([plot.left, plot.right]);
  const cell = band.bandwidth();
  const catPos = (i: number) => (isBar ? (band(i) ?? 0) + cell / 2 : (point(i) ?? 0));
  const base = value(Math.max(domainMin, Math.min(0, domainMax)));

  // ── interaction ──
  const onPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.type === 'pointerdown') touching.current = e.pointerType !== 'mouse';
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    if (x < plot.left || x > plot.right || y < plot.top || y > plot.bottom) {
      setHover(null);
      return;
    }
    const along = horizontal ? y : x;
    const [start, end] = horizontal ? [plot.top, plot.bottom] : [plot.left, plot.right];
    const index = categoryIndexAt(along, start, end, categories.length, isBar ? 'band' : 'point');
    setHover((prev) => (prev && prev.index === index && prev.x === x && prev.y === y ? prev : { index, x, y }));
  };
  const onLeave = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'mouse') setHover(null);
  };

  // ── chrome ──
  const xLabels = horizontal
    ? yTicks.map((t) => ({ pos: value(t), text: valueTickText(t) }))
    : categories.map((c, i) => ({ pos: catPos(i), text: truncateLabel(String(c), labelChars) }));
  const showX = visibleTicks(
    xLabels.map((l) => ({ pos: l.pos, width: textWidth(l.text, fontSize) })),
    narrow ? 8 : 16
  );
  // A label never runs past the chart's edges: the first and last lean in.
  const labelX = (l: { pos: number; text: string }) => {
    const half = textWidth(l.text, fontSize) / 2;
    return Math.min(Math.max(l.pos, half), width - half);
  };
  const nameChars = Math.max(1, Math.floor((nameWidth - 4) / (fontSize * 0.6)));

  const clipId = `${uid}-clip`;
  const dotsOf = (s: FoldedSeries, i: number, key: string) => {
    const v = s.data[i];
    if (v == null) return null;
    const can = pressable(s, i);
    return (
      <circle
        key={key}
        cx={catPos(i)}
        cy={value(v)}
        r={DOT_RADIUS}
        fill={colorOf(s)}
        stroke={CHART_SURFACE_COLOR}
        strokeWidth={2}
        className={can ? 'cursor-pointer' : undefined}
        onClick={can ? () => pressEntry(s, i) : undefined}
      />
    );
  };

  const marks = (() => {
    if (!isBar) {
      return series.map((s, si) => {
        const pts: Point[] = [];
        s.data.forEach((v, i) => {
          if (v != null && i < categories.length) pts.push([catPos(i), value(v)]);
        });
        const color = colorOf(s);
        return (
          <g key={s.name} data-series={seriesLabel(s.name)} data-kind={chartType}>
            {chartType === 'area' && pts.length > 1 && (
              <path d={areaPath(pts, base)} fill={`url(#${uid}-${si})`} stroke="none" clipPath={`url(#${clipId})`} />
            )}
            {pts.length > 1 && (
              <path
                d={linePath(pts)}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                clipPath={`url(#${clipId})`}
              />
            )}
            {pts.length === 1 && <circle cx={pts[0][0]} cy={pts[0][1]} r={DOT_RADIUS} fill={color} />}
          </g>
        );
      });
    }
    // bar + stackedBar. Only the top segment of a stack gets the rounded cap;
    // stacked segments are split by a hairline of the surface colour.
    const maxBar = narrow ? 20 : 28;
    const layout = barLayout(cell, stacked ? 1 : series.length, maxBar);
    const segments = stacked ? stackSegments(series, categories.length) : null;
    return series.map((s, si) => {
      const capped = !stacked || si === series.length - 1;
      return (
        <g
          key={s.name}
          data-series={seriesLabel(s.name)}
          data-kind={chartType}
          data-radius={(capped ? barRadii(BAR_RADIUS, horizontal, false) : [0, 0, 0, 0]).join(',')}
          fill={colorOf(s)}
          stroke={stacked ? CHART_SURFACE_COLOR : undefined}
          strokeWidth={stacked ? 1 : 0}
        >
          {categories.map((_, i) => {
            const v = s.data[i];
            if (v == null) return null;
            const seg = segments?.[si][i] ?? { lo: Math.min(0, v), hi: Math.max(0, v) };
            const lo = stacked ? seg.lo : Math.max(domainMin, seg.lo);
            const hi = stacked ? seg.hi : Math.min(domainMax, seg.hi);
            const along = (band(i) ?? 0) + layout.offset + (stacked ? 0 : si * layout.step);
            const [a, b] = [value(lo), value(hi)];
            const [x, y, w, h] = horizontal
              ? [Math.min(a, b), along, Math.abs(b - a), layout.size]
              : [along, Math.min(a, b), layout.size, Math.abs(b - a)];
            const radii = capped ? barRadii(BAR_RADIUS, horizontal, v < 0) : ([0, 0, 0, 0] as const);
            const can = pressable(s, i);
            return (
              <path
                key={i}
                d={roundedBarPath(x, y, w, h, radii)}
                data-bar={i}
                className={
                  onSelectEntry && can
                    ? 'cursor-pointer hover:opacity-80 active:opacity-60'
                    : undefined
                }
                onClick={onSelectEntry ? () => pressEntry(s, i) : undefined}
              />
            );
          })}
        </g>
      );
    });
  })();

  const cursor =
    hover &&
    (isBar ? (
      <rect
        x={horizontal ? plot.left : (band(hover.index) ?? 0)}
        y={horizontal ? (band(hover.index) ?? 0) : plot.top}
        width={horizontal ? plot.right - plot.left : cell}
        height={horizontal ? cell : plot.bottom - plot.top}
        fill={CHART_CURSOR_COLOR}
        opacity={0.6}
      />
    ) : (
      <line
        x1={catPos(hover.index)}
        x2={catPos(hover.index)}
        y1={plot.top}
        y2={plot.bottom}
        stroke={CHART_AXIS_COLOR}
        strokeOpacity={0.4}
        strokeWidth={1}
      />
    ));

  return (
    <div
      ref={ref}
      className={cn(
        'flex w-full min-w-0 flex-col gap-space-8',
        fill ? 'h-full min-h-0' : 'aspect-video desk:aspect-wide',
        className
      )}
      {...props}
    >
      {series.length > 1 && (
        <ChartLegend
          items={series.map((s) => ({ name: seriesLabel(s.name), color: colorOf(s) }))}
          line={chartType === 'line'}
        />
      )}
      <div ref={plotRef} className="relative min-h-0 w-full flex-1">
        {/* The SVG has no accessible name or text, so mirror the data into a visually-hidden table. */}
        <ChartDataTable data={data} />
        {measured && (
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="absolute inset-0 touch-pan-y overflow-visible"
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            onPointerLeave={onLeave}
          >
            <defs>
              {chartType === 'area' &&
                series.map((s, i) => (
                  <linearGradient key={s.name} id={`${uid}-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colorOf(s)} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={colorOf(s)} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              <clipPath id={clipId}>
                <RevealRect width={width} height={height} />
              </clipPath>
            </defs>

            <g data-part="grid">
              {yTicks.map((t) => value(t)).map((p, i) =>
                horizontal ? (
                  <line key={i} x1={p} x2={p} y1={plot.top} y2={plot.bottom} stroke={CHART_GRID_COLOR} />
                ) : (
                  <line key={i} x1={plot.left} x2={plot.right} y1={p} y2={p} stroke={CHART_GRID_COLOR} />
                )
              )}
            </g>

            {cursor}
            {marks}

            <g data-part="x-axis" fontSize={fontSize} fill={CHART_AXIS_COLOR}>
              {xLabels.map((l, i) =>
                showX[i] ? (
                  <text key={i} x={labelX(l)} y={plot.bottom + 14} dy="0.71em" textAnchor="middle">
                    {l.text}
                  </text>
                ) : null
              )}
            </g>
            <g data-part="y-axis" data-ticks={JSON.stringify(yTicks)} fontSize={fontSize} fill={CHART_AXIS_COLOR}>
              {horizontal
                ? categories.map((c, i) => (
                    <text key={i} x={plot.left - AXIS_GAP} y={catPos(i)} dy="0.355em" textAnchor="end">
                      {truncateLabel(String(c), nameChars)}
                    </text>
                  ))
                : yTicks.map((t) => (
                    <text key={t} x={plot.left - AXIS_GAP} y={value(t)} dy="0.355em" textAnchor="end">
                      {valueTickText(t)}
                    </text>
                  ))}
            </g>

            {hover && !isBar && series.map((s) => dotsOf(s, hover.index, `${s.name}-dot`))}
          </svg>
        )}
        {measured && hover && (
          <ChartFloat x={hover.x} y={hover.y} width={width} height={height}>
            <ChartTooltip
              active
              label={categories[hover.index]}
              payload={series.map((s) => ({
                name: seriesLabel(s.name),
                value: s.data[hover.index] ?? null,
                color: colorOf(s),
                dataKey: s.name,
              }))}
              format={format.full}
              colors={colors}
              showTotal={stacked}
            />
          </ChartFloat>
        )}
      </div>
    </div>
  );
});
