// Legacy chart colours (--chart-N tokens). The formatting helpers live in @/lib/charts/chart-format.

/** Categorical slots defined in globals.css (light + dark), in fixed order. */
export const SERIES_SLOTS = 8;

/** Colour of the folded "Other" bucket — a neutral, never a ninth hue. */
export const OTHER_COLOR = 'hsl(var(--chart-other))';

/**
 * Surface the chart sits on. Used for the 2px gap between touching marks and
 * the ring around hover dots; a host on a non-card surface overrides
 * `--chart-surface`.
 */
export const SURFACE_COLOR = 'var(--chart-surface, hsl(var(--card)))';

export function seriesColor(index: number): string {
  return `hsl(var(--chart-${(index % SERIES_SLOTS) + 1}))`;
}
