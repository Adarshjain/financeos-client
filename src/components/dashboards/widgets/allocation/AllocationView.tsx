'use client';

// The allocation template view: a donut of open holdings' current value by
// asset class and a legend (class, share, ₹). A legend row opens that class's
// holdings (an ad-hoc KPI over positions). The legend is the chart's text
// equivalent; the donut is decorative for screen readers.

import { PieChart } from 'lucide-react';
import { useState } from 'react';

import { formatCompact, SURFACE_COLOR } from '@/components/charts/chart-format';
import { useElementSize } from '@/components/charts/useElementSize';
import { LazyKpiUnderlyingDialog } from '@/components/reports/underlying/LazyUnderlyingDialogs';
import type { ChartData } from '@/lib/reports.types';

import type { TemplateViewProps } from '../../builtins/registry';
import { positionsValueRequest, rupees, WidgetEmpty } from '../investmentsLoansKit/kit';
import { type AllocationSlice, allocationSlices, formatShare, sliceFilter } from './allocation';

/** Below this width the ₹ figures go compact (₹12.5L). */
const COMPACT_BELOW_PX = 360;

export function AllocationView({ data }: TemplateViewProps) {
  const slices = data.type === 'CHART' ? allocationSlices(data as ChartData) : [];
  const [frameRef, { width }] = useElementSize<HTMLDivElement>();
  const [opened, setOpened] = useState<AllocationSlice | null>(null);

  if (slices.length === 0) {
    return <WidgetEmpty icon={PieChart} title="No open holdings to split yet" />;
  }

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const compact = width > 0 && width < COMPACT_BELOW_PX;

  return (
    <div ref={frameRef} className="flex h-full min-h-0 items-center gap-4 px-4 pb-3" data-testid="allocation-view">
      <Donut slices={slices} total={total} />
      <ul className="max-h-full min-w-0 flex-1 space-y-0.5 overflow-y-auto" aria-label="Allocation by asset class">
        {slices.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => setOpened(s)}
              className="group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:hover:bg-slate-800/50 dark:focus-visible:bg-slate-800/50"
            >
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{s.label}</span>
              <span className="w-9 shrink-0 text-right text-2xs tabular-nums text-slate-500 dark:text-slate-400">
                {formatShare(s.share)}
              </span>
              <span
                className="shrink-0 font-medium tabular-nums text-slate-900 decoration-dotted underline-offset-4 group-hover:underline group-focus-visible:underline dark:text-white"
                title={rupees(s.value)}
              >
                {compact ? formatCompact(s.value, true) : rupees(s.value)}
              </span>
              {' '}
              <span className="sr-only">— view underlying data</span>
            </button>
          </li>
        ))}
      </ul>
      {opened && (
        <LazyKpiUnderlyingDialog
          source={{ kind: 'adhoc', request: positionsValueRequest([sliceFilter(opened.key)]) }}
          title={`${opened.label} holdings`}
          open
          onOpenChange={(o) => !o && setOpened(null)}
        />
      )}
    </div>
  );
}

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Each slice's arc: its length and where it starts along the ring. */
function arcs(slices: AllocationSlice[]): Array<{ slice: AllocationSlice; length: number; start: number }> {
  const out: Array<{ slice: AllocationSlice; length: number; start: number }> = [];
  let start = 0;
  for (const slice of slices) {
    const length = slice.share * CIRCUMFERENCE;
    out.push({ slice, length, start });
    start += length;
  }
  return out;
}

/** A point on the ring's radial line at `fraction` of the way round (0 = 12 o'clock after the rotation). */
function radial(fraction: number, r: number): { x: number; y: number } {
  const angle = fraction * 2 * Math.PI;
  return { x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) };
}

/** A ring of arcs from 12 o'clock, clockwise, with the total in the hole. */
function Donut({ slices, total }: { slices: AllocationSlice[]; total: number }) {
  const ring = arcs(slices);
  return (
    <div className="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28" aria-hidden data-testid="allocation-donut">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        {ring.map(({ slice, length, start }) => (
          <circle
            key={slice.key}
            cx={50}
            cy={50}
            r={RADIUS}
            fill="none"
            stroke={slice.color}
            strokeWidth={14}
            strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
            strokeDashoffset={-start}
          />
        ))}
        {ring.length > 1 &&
          ring.map(({ slice, start }) => {
            // A thin gap in the surface colour where two arcs meet.
            const from = radial(start / CIRCUMFERENCE, RADIUS - 8);
            const to = radial(start / CIRCUMFERENCE, RADIUS + 8);
            return (
              <line
                key={`gap-${slice.key}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={SURFACE_COLOR}
                strokeWidth={1.5}
              />
            );
          })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xs text-slate-500 dark:text-slate-400">Total</span>
        <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
          {formatCompact(total, true)}
        </span>
      </div>
    </div>
  );
}
