// Dinero chart colours: chart-1 … chart-5 for series, chart-rest for the folded "Other". Light and dark come from the tokens.

/** Categorical slots in the Dinero palette. */
export const CHART_SLOTS = 5;

export const CHART_REST_COLOR = 'var(--ds-chart-rest)';

/** Surface the chart sits on: the gap between touching marks and the ring around hover dots. */
export const CHART_SURFACE_COLOR = 'var(--ds-bg-surface)';

export const CHART_AXIS_COLOR = 'var(--ds-ink-3)';
export const CHART_GRID_COLOR = 'var(--ds-line)';
/** Outline marking one mark among many (today in the heatmap). */
export const CHART_OUTLINE_COLOR = 'var(--ds-ink-2)';
export const CHART_CURSOR_COLOR = 'var(--ds-bg-hover)';

export function chartColor(index: number): string {
  return `var(--ds-chart-${(index % CHART_SLOTS) + 1})`;
}

/** Plot margins in px; the right edge is set per width. */
const [top, bottom, left] = [8, 0, 0];
export const CHART_MARGIN = { top, bottom, left };
