// The combination guards the server sends on catalog fields, mirrored over the editor state so the editor can say
// what is blocked before the server rejects it. Pure: no React. Problems never gate Preview (see ReportEditor).

import type { Aggregation, DatasourceCatalog, FieldGuard, FilterClause } from '@/lib/reports.types';

import type { BuilderState } from './builderReducer';
import { fieldByName, isDateFieldName } from './catalog';
import { hasSeries, isFilterComplete } from './serialize';

/** A measure as the guards see it: its field and, once chosen, its aggregation. */
export interface GuardMeasure {
  field?: string;
  aggregation?: Aggregation;
}

/** A `needs` guard without an aggregation list applies to these (count is exempt). */
const DEFAULT_NEEDS: Aggregation[] = ['sum', 'avg', 'min', 'max'];

const labelOf = (catalog: DatasourceCatalog, name: string): string => fieldByName(catalog, name)?.label ?? name;
const guardsOf = (catalog: DatasourceCatalog, name: string | undefined, kind: FieldGuard['kind']): FieldGuard[] =>
  (fieldByName(catalog, name)?.guards ?? []).filter((g) => g.kind === kind);

const noAggregationMessage = (label: string, g: FieldGuard) => `${label} ${g.reason}.`;
const needsMessage = (catalog: DatasourceCatalog, label: string, g: FieldGuard) =>
  `${label} ${g.reason}. Split by ${(g.fields ?? []).map((f) => labelOf(catalog, f)).join(' or ')}, or filter it to one value.`;
const avoidMessage = (catalog: DatasourceCatalog, label: string, g: FieldGuard, conflicts: string[]) =>
  `${label} ${g.reason}. Remove the split or filter on ${conflicts.map((f) => labelOf(catalog, f)).join(' and ')}.`;
const noFilterMessage = (label: string, g: FieldGuard) => `${label} ${g.reason}, so it can't be filtered.`;

/** Whether an `avoid` guard applies to this aggregation (no list = any). */
const avoidApplies = (g: FieldGuard, aggregation: Aggregation | undefined) =>
  !g.aggregations || (!!aggregation && g.aggregations.includes(aggregation));

/** Why `measure` cannot be aggregated by `agg`, if a no_aggregation guard says so. */
export function aggregationBlockedReason(catalog: DatasourceCatalog, measure: string, agg: Aggregation): string | undefined {
  const g = guardsOf(catalog, measure, 'no_aggregation').find((x) => (x.aggregations ?? []).includes(agg));
  return g ? noAggregationMessage(labelOf(catalog, measure), g) : undefined;
}

/** Why `field` cannot be a split next to these measures, if an avoid guard says so. */
export function splitBlockedReason(catalog: DatasourceCatalog, measures: GuardMeasure[], field: string): string | undefined {
  for (const m of measures) {
    const g = guardsOf(catalog, m.field, 'avoid').find((x) => (x.fields ?? []).includes(field) && avoidApplies(x, m.aggregation));
    if (g && m.field) return avoidMessage(catalog, labelOf(catalog, m.field), g, [field]);
  }
  return undefined;
}

/** Why `field` cannot be filtered, if a no_filter guard says so. */
export function filterBlockedReason(catalog: DatasourceCatalog, field: string): string | undefined {
  const g = guardsOf(catalog, field, 'no_filter')[0];
  return g ? noFilterMessage(labelOf(catalog, field), g) : undefined;
}

/** The measures the report aggregates (raw tables have none) and the fields it splits by. */
function shape(state: BuilderState): { measures: GuardMeasure[]; splits: string[]; raw: boolean } {
  if (state.type === 'KPI') return { measures: [{ field: state.kpi.measure, aggregation: state.kpi.aggregation }], splits: [], raw: false };
  if (state.type === 'CHART') {
    const c = state.chart;
    const splits = [c.dimensionField, hasSeries(c.chartType) ? c.seriesField : undefined, c.chartType === 'breakdown' ? c.subDimensionField : undefined];
    return { measures: [{ field: c.measureField, aggregation: c.measureAggregation }], splits: splits.filter((f): f is string => !!f), raw: false };
  }
  const t = state.table;
  if (t.tableMode === 'raw') return { measures: [], splits: [], raw: true };
  return {
    measures: t.agg.measures.map((m) => ({ field: m.field, aggregation: m.aggregation })),
    splits: [...t.agg.rows, ...t.agg.columns].map((g) => g.field).filter((f): f is string => !!f),
    raw: false,
  };
}

/** A filter that pins the field to one value ("is", "exact", or "in" with one value; a date only by "is"). */
function pinsToOne(catalog: DatasourceCatalog, f: FilterClause): boolean {
  if (f.operator === 'is') return !Array.isArray(f.value);
  if (f.operator === 'exact') return !isDateFieldName(catalog, f.field) && f.value != null && !Array.isArray(f.value);
  if (f.operator === 'in') return !isDateFieldName(catalog, f.field) && Array.isArray(f.value) && f.value.length === 1;
  return false;
}

/**
 * Everything in the draft the server would reject for its combination of fields, as messages (deduped). Shown as a
 * warning; they do not stop Preview.
 */
export function guardProblems(state: BuilderState, catalog: DatasourceCatalog): string[] {
  const { measures, splits, raw } = shape(state);
  const filters = state.filters.filter((f) => isFilterComplete(catalog, f));
  const out = new Set<string>();

  for (const f of filters) {
    const g = guardsOf(catalog, f.field, 'no_filter')[0];
    if (g) out.add(noFilterMessage(labelOf(catalog, f.field), g));
  }
  if (raw) return [...out];

  for (const m of measures) {
    if (!m.field) continue;
    const label = labelOf(catalog, m.field);
    for (const g of guardsOf(catalog, m.field, 'no_aggregation')) {
      if (m.aggregation && (g.aggregations ?? []).includes(m.aggregation)) out.add(noAggregationMessage(label, g));
    }
    for (const g of guardsOf(catalog, m.field, 'needs')) {
      if (!m.aggregation || !(g.aggregations ?? DEFAULT_NEEDS).includes(m.aggregation)) continue;
      const fields = g.fields ?? [];
      const met = fields.some((name) => splits.includes(name) || filters.some((f) => f.field === name && pinsToOne(catalog, f)));
      if (!met) out.add(needsMessage(catalog, label, g));
    }
    for (const g of guardsOf(catalog, m.field, 'avoid')) {
      if (!avoidApplies(g, m.aggregation)) continue;
      const conflicts = (g.fields ?? []).filter((name) => splits.includes(name) || filters.some((f) => f.field === name));
      if (conflicts.length > 0) out.add(avoidMessage(catalog, label, g, conflicts));
    }
  }
  return [...out];
}
