// Pure geometry for the Dinero SVG charts: paths from d3-shape, bar layout and tick thinning.
// Nothing here touches the DOM, so it is covered by plain unit tests.

import { area, curveMonotoneX, line } from 'd3-shape';

/** Average glyph width as a fraction of the font size; used where text cannot be measured (SSR, jsdom). */
const GLYPH_EM = 0.6;

export function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * GLYPH_EM;
}

export type Point = readonly [number, number];

/** A smooth line through the points (gaps are joined: callers drop null values first). */
export function linePath(points: Point[]): string {
  return line().curve(curveMonotoneX)(points as [number, number][]) ?? '';
}

/** A smooth area between the points and a flat baseline. */
export function areaPath(points: Point[], baseline: number): string {
  return (
    area<Point>()
      .curve(curveMonotoneX)
      .x((p) => p[0])
      .y0(baseline)
      .y1((p) => p[1])(points) ?? ''
  );
}

/** Corner radii in the order top-left, top-right, bottom-right, bottom-left. */
export type Radii = readonly [number, number, number, number];

/** A rectangle path with per-corner radii, each clamped so it never exceeds half the bar. */
export function roundedBarPath(x: number, y: number, w: number, h: number, radii: Radii): string {
  const limit = Math.max(0, Math.min(w, h) / 2);
  const [tl, tr, br, bl] = radii.map((r) => Math.min(r, limit));
  return [
    `M${x + tl},${y}`,
    `H${x + w - tr}`,
    `A${tr},${tr} 0 0 1 ${x + w},${y + tr}`,
    `V${y + h - br}`,
    `A${br},${br} 0 0 1 ${x + w - br},${y + h}`,
    `H${x + bl}`,
    `A${bl},${bl} 0 0 1 ${x},${y + h - bl}`,
    `V${y + tl}`,
    `A${tl},${tl} 0 0 1 ${x + tl},${y}`,
    'Z',
  ].join(' ');
}

/** The radii of a bar's far end: the end away from the baseline gets `r`, upright or lying down. */
export function barRadii(r: number, horizontal: boolean, negative: boolean): Radii {
  if (horizontal) return negative ? [r, 0, 0, r] : [0, r, r, 0];
  return negative ? [0, 0, r, r] : [r, r, 0, 0];
}

/** Where a group of `count` bars sits inside one category cell: offset from the cell start, and the bar size. */
export function barLayout(cell: number, count: number, maxBar: number, gap = 2, categoryGap = 0.24) {
  // The gap is left on each side of the group.
  const group = cell * (1 - 2 * categoryGap);
  const size = Math.max(0, Math.min(maxBar, (group - gap * (count - 1)) / count));
  const total = size * count + gap * (count - 1);
  return { size, offset: (cell - total) / 2, step: size + gap };
}

/** One stacked segment's extent on the value axis: lo..hi. */
export interface Segment {
  lo: number;
  hi: number;
}

/** Stacks the series per category: positives climb from zero, negatives descend from it; null values have no segment. */
export function stackSegments(
  series: ReadonlyArray<{ data: ReadonlyArray<number | null | undefined> }>,
  categoryCount: number
): (Segment | null)[][] {
  const up = new Array<number>(categoryCount).fill(0);
  const down = new Array<number>(categoryCount).fill(0);
  return series.map((s) =>
    Array.from({ length: categoryCount }, (_, i) => {
      const v = s.data[i];
      if (v == null) return null;
      if (v >= 0) {
        const lo = up[i];
        up[i] += v;
        return { lo, hi: up[i] };
      }
      const hi = down[i];
      down[i] += v;
      return { lo: down[i], hi };
    })
  );
}

/**
 * Which ticks keep their label: the first and last always, the rest only when they clear the
 * previous label and the last one by `minGap`.
 */
export function visibleTicks(ticks: ReadonlyArray<{ pos: number; width: number }>, minGap: number): boolean[] {
  const show = ticks.map(() => false);
  if (ticks.length === 0) return show;
  const last = ticks.length - 1;
  show[0] = true;
  show[last] = true;
  let edge = ticks[0].pos + ticks[0].width / 2;
  const limit = last > 0 ? ticks[last].pos - ticks[last].width / 2 - minGap : Infinity;
  for (let i = 1; i < last; i++) {
    const t = ticks[i];
    const start = t.pos - t.width / 2;
    const end = t.pos + t.width / 2;
    if (start >= edge + minGap && end <= limit) {
      show[i] = true;
      edge = end;
    }
  }
  return show;
}

/** The category under a pointer coordinate: bands (bars) by cell, points (lines) by the nearest one. */
export function categoryIndexAt(p: number, start: number, end: number, count: number, kind: 'band' | 'point'): number {
  if (count <= 1 || end <= start) return 0;
  const raw = kind === 'band' ? Math.floor(((p - start) / (end - start)) * count) : Math.round(((p - start) / (end - start)) * (count - 1));
  return Math.min(count - 1, Math.max(0, raw));
}

/**
 * Where a hover card of `cardW`×`cardH` goes for a pointer at (x, y) inside a `width`×`height` chart:
 * 10 right and below the pointer, flipped left / above when it would overflow, then clamped inside.
 */
export function placeFloat(x: number, y: number, width: number, height: number, cardW: number, cardH: number) {
  const gap = 10;
  const left = x + gap + cardW > width ? x - gap - cardW : x + gap;
  const top = y + gap + cardH > height ? y - gap - cardH : y + gap;
  return {
    left: Math.max(0, Math.min(left, width - cardW)),
    top: Math.max(0, Math.min(top, height - cardH)),
  };
}
