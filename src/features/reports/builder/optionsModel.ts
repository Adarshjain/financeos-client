import type { SelectGroup, SelectOption } from '@/components/ds/Select/Select';
import { areaOf } from '@/features/reports/list/reportsListModel';
import type { Aggregation, ChartDefinition, DatasourceCatalog, DatasourceDef, Granularity, ReportType } from '@/lib/reports.types';

import { aggsFor, fieldsFor } from './catalog';
import { aggregationBlockedReason, type GuardMeasure, splitBlockedReason } from './guardsModel';
import { AGGREGATION_LABELS, CHART_TYPE_LABELS, GRANULARITY_LABELS } from './labelsModel';

/** The value a Select uses for "nothing chosen" (a Select has no empty option of its own). */
export const NONE = '__none__';

export const FORMAT_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'KPI', label: 'KPI' },
  { value: 'CHART', label: 'Chart' },
  { value: 'TABLE', label: 'Table' },
];

/** Every chart subtype, in the order the Chart type select lists them. */
export const CHART_TYPE_ALL: Record<ChartDefinition['chartType'], string> = { ...CHART_TYPE_LABELS, breakdown: 'Breakdown' };

export const chartTypeOptions = (): SelectOption[] =>
  (Object.keys(CHART_TYPE_ALL) as ChartDefinition['chartType'][]).map((value) => ({ value, label: CHART_TYPE_ALL[value] }));

export const granularityOptions = (): SelectOption[] =>
  (Object.keys(GRANULARITY_LABELS) as Granularity[]).map((value) => ({ value, label: GRANULARITY_LABELS[value] }));

/** Aggregations of a measure; one a guard blocks is disabled with its reason (unless it is the one currently held). */
export const aggregationOptions = (catalog: DatasourceCatalog, measure: string | undefined, keep?: Aggregation): SelectOption[] =>
  aggsFor(catalog, measure).map((a: Aggregation) => {
    const reason = a === keep || !measure ? undefined : aggregationBlockedReason(catalog, measure, a);
    return { value: a, label: AGGREGATION_LABELS[a], ...(reason ? { disabled: true, disabledReason: reason } : {}) };
  });

export const measureOptions = (catalog: DatasourceCatalog, type: ReportType): SelectOption[] =>
  fieldsFor(catalog, 'measure', type).map((f) => ({ value: f.name, label: f.label }));

/**
 * Dimension choices for `type`, without the fields in `exclude` (unless it is the one currently held). With the
 * measures in use, a field their guards forbid splitting by is disabled with its reason (also unless held).
 */
export const dimensionOptions = (
  catalog: DatasourceCatalog,
  type: ReportType,
  exclude: string[] = [],
  keep?: string,
  measures: GuardMeasure[] = [],
): SelectOption[] =>
  fieldsFor(catalog, 'dimension', type)
    .filter((f) => f.name === keep || !exclude.includes(f.name))
    .map((f) => {
      const reason = f.name === keep ? undefined : splitBlockedReason(catalog, measures, f.name);
      return { value: f.name, label: f.label, ...(reason ? { disabled: true, disabledReason: reason } : {}) };
    });

/** The datasources, grouped by area as the Reports list groups them. */
export function datasourceGroups(datasources: DatasourceDef[]): SelectGroup[] {
  const groups = new Map<string, SelectGroup>();
  for (const ds of datasources) {
    const area = areaOf(ds.name);
    const group = groups.get(area.id) ?? { name: area.label, options: [] };
    group.options.push({ value: ds.name, label: ds.label });
    groups.set(area.id, group);
  }
  return [...groups.values()];
}

/** Keeps a hand-typed Top N / sub-rows count as a whole number, or undefined when the box is empty. */
export function parseCount(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : NaN;
}
