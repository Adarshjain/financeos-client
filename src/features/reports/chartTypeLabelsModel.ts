import type { ChartDefinition } from '@/lib/reports.types';

export const CHART_TYPE_LABELS: Record<Exclude<ChartDefinition['chartType'], 'breakdown'>, string> = {
  line: 'Line',
  bar: 'Bar',
  stackedBar: 'Stacked bar',
  area: 'Area',
  pie: 'Pie',
  donut: 'Donut',
};

/** The label of a chart subtype as the report list returns it ("stackedBar", "breakdown"…); unknown values show as they are. */
export function chartTypeLabel(wire: string): string {
  if (wire === 'breakdown') return 'Breakdown';
  return CHART_TYPE_LABELS[wire as keyof typeof CHART_TYPE_LABELS] ?? wire;
}
