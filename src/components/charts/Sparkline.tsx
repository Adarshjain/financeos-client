// A tiny trend line: one series as an SVG polyline (plus a faint area under it)
// that stretches to its box. No axes, no tooltip — for a figure's recent
// direction at a glance. Colour comes from `currentColor`, so callers set it
// with a text-* class. Fewer than two points draw nothing.

import { cn } from '@/lib/utils';

export interface SparklineProps {
  values: readonly number[];
  className?: string;
  /** Accessible description; omitted = decorative (aria-hidden). */
  label?: string;
  /** Draw the faint area under the line (default true). */
  area?: boolean;
}

const W = 100;
const H = 32;
// Keep the stroke off the very top and bottom edge.
const PAD = 2;

/** Polyline points for the values in a W×H box (flat series sit mid-height). */
export function sparklinePoints(values: readonly number[]): string {
  if (values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = span === 0 ? H / 2 : PAD + (1 - (v - min) / span) * (H - PAD * 2);
      return `${round(x)},${round(y)}`;
    })
    .join(' ');
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function Sparkline({ values, className, label, area = true }: SparklineProps) {
  const points = sparklinePoints(values);
  if (!points) return null;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn('block h-8 w-full', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-testid="sparkline"
    >
      {area && <polygon points={`0,${H} ${points} ${W},${H}`} fill="currentColor" opacity={0.1} />}
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
