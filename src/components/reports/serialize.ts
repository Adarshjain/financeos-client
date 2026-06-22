// Serialize builder state into the exact wire shapes. Correctness rules are
// enforced HERE (not just in the UI) so they cannot leak: granularity is
// attached iff the field is a date; pie/donut omit series; KPI comparison is
// omitted when on with no preference, and carries { enabled: false } /
// { higherIsBetter } only when set; aggregated sort keys follow
// `${field}_${aggregation}`. Hiding excluded transactions is just an
// `isExcluded is false` clause in `filters` like any other filter.

import type {
  Aggregation,
  ChartDefinition,
  CreateReportRequest,
  DatasourceCatalog,
  DimensionRef,
  FilterClause,
  Granularity,
  KpiDefinition,
  MeasureRef,
  ReportDefinition,
  RunReportRequest,
  TableDefinitionAggregated,
  TableDefinitionRaw,
  UpdateReportRequest,
} from '@/lib/reports.types';

import type { BuilderState } from './builderReducer';
import { fieldByName, isDateFieldName, valueKind } from './catalog';

/** Whether a filter clause has a value appropriate to its operator. */
function isFilterComplete(
  catalog: DatasourceCatalog,
  clause: FilterClause,
): boolean {
  const field = fieldByName(catalog, clause.field);
  if (!field || !clause.operator) return false;
  const v = clause.value;
  switch (valueKind(catalog, field, clause.operator)) {
    case 'none':
      return true;
    case 'multi':
      return Array.isArray(v) && v.length > 0;
    case 'numberBetween': {
      if (!v || typeof v !== 'object' || !('from' in v)) return false;
      const r = v as { from: number; to: number };
      return Number.isFinite(r.from) && Number.isFinite(r.to);
    }
    case 'dateBetween': {
      if (!v || typeof v !== 'object' || !('from' in v)) return false;
      const r = v as { from: string; to: string };
      return r.from !== '' && r.to !== '';
    }
    case 'relativeAmount': {
      if (!v || typeof v !== 'object' || !('amount' in v)) return false;
      return Number.isFinite((v as { amount: number }).amount);
    }
    case 'boolean':
      return typeof v === 'boolean';
    default:
      return v !== undefined && v !== null && v !== '';
  }
}

/** Drop filters that are still being edited so they never reach the API. */
function cleanFilters(
  catalog: DatasourceCatalog,
  filters: FilterClause[],
): FilterClause[] {
  return filters.filter((f) => isFilterComplete(catalog, f));
}

function dimRef(
  catalog: DatasourceCatalog,
  field: string,
  granularity: Granularity | undefined,
): DimensionRef {
  // granularity belongs ONLY on date fields; omit it everywhere else.
  if (isDateFieldName(catalog, field) && granularity) {
    return { field, granularity };
  }
  return { field };
}

export function serializeDefinition(
  state: BuilderState,
  catalog: DatasourceCatalog,
): ReportDefinition {
  const filters = cleanFilters(catalog, state.filters);

  if (state.type === 'KPI') {
    const k = state.kpi;
    const def: KpiDefinition = {
      measure: k.measure ?? '',
      aggregation: k.aggregation ?? 'sum',
      filters,
    };
    // Comparison is on by default server-side. Only send the block to turn it
    // OFF or to express a higher-is-better preference (drives the sentiment).
    const comparison: NonNullable<KpiDefinition['comparison']> = {};
    if (!k.comparisonEnabled) comparison.enabled = false;
    if (k.higherIsBetter !== undefined) comparison.higherIsBetter = k.higherIsBetter;
    if (Object.keys(comparison).length > 0) def.comparison = comparison;
    return def;
  }

  if (state.type === 'CHART') {
    const c = state.chart;
    const isPieDonut = c.chartType === 'pie' || c.chartType === 'donut';
    const def: ChartDefinition = {
      chartType: c.chartType,
      dimension: dimRef(catalog, c.dimensionField ?? '', c.dimensionGranularity),
      measure: {
        field: c.measureField ?? '',
        aggregation: c.measureAggregation ?? 'sum',
      },
      filters,
    };
    if (!isPieDonut && c.seriesField) {
      def.series = dimRef(catalog, c.seriesField, c.seriesGranularity);
    }
    return def;
  }

  // TABLE
  const t = state.table;
  if (t.tableMode === 'raw') {
    const def: TableDefinitionRaw = {
      mode: 'raw',
      columns: t.raw.columns,
      filters,
    };
    if (t.raw.sort.length) def.sort = t.raw.sort;
    return def;
  }

  // Aggregated → pivot. Drop incomplete row/column/measure drafts first.
  const toDimRefs = (drafts: { field?: string; granularity?: Granularity }[]) =>
    drafts
      .filter((g) => g.field)
      .map((g) => dimRef(catalog, g.field as string, g.granularity));
  const rows: DimensionRef[] = toDimRefs(t.agg.rows);
  const columns: DimensionRef[] = toDimRefs(t.agg.columns);
  const measures: MeasureRef[] = t.agg.measures
    .filter((m) => m.field && m.aggregation)
    .map((m) => ({
      field: m.field as string,
      aggregation: m.aggregation as Aggregation,
    }));

  const def: TableDefinitionAggregated = {
    mode: 'aggregated',
    rows,
    columns,
    measures,
    filters,
  };
  if (t.agg.sort.length) def.sort = t.agg.sort;
  return def;
}

export function buildRunRequest(
  state: BuilderState,
  catalog: DatasourceCatalog,
): RunReportRequest {
  return {
    type: state.type,
    datasource: state.datasource,
    definition: serializeDefinition(state, catalog),
  };
}

export function buildCreateRequest(
  state: BuilderState,
  catalog: DatasourceCatalog,
): CreateReportRequest {
  return {
    name: state.name.trim(),
    description: state.description.trim() || null,
    type: state.type,
    datasource: state.datasource,
    definition: serializeDefinition(state, catalog),
  };
}

export function buildUpdateRequest(
  state: BuilderState,
  catalog: DatasourceCatalog,
): UpdateReportRequest {
  return {
    name: state.name.trim(),
    description: state.description.trim() || null,
    definition: serializeDefinition(state, catalog),
  };
}

/** Aggregated-table sort key for a measure: `${field}_${aggregation}`. */
export function aggregatedColumnKey(field: string, aggregation: string): string {
  return `${field}_${aggregation}`;
}

/** Reasons the current definition cannot be run/saved yet (for inline hints). */
export function validationErrors(
  state: BuilderState,
  catalog: DatasourceCatalog,
): string[] {
  const errors: string[] = [];

  if (state.type === 'KPI') {
    const k = state.kpi;
    if (!k.measure) errors.push('Select a measure.');
    if (!k.aggregation) errors.push('Select an aggregation.');
  } else if (state.type === 'CHART') {
    const c = state.chart;
    if (!c.dimensionField) {
      errors.push('Select a dimension.');
    } else if (isDateFieldName(catalog, c.dimensionField) && !c.dimensionGranularity) {
      errors.push('Select a granularity for the date dimension.');
    }
    if (!c.measureField) errors.push('Select a measure.');
    else if (!c.measureAggregation) errors.push('Select a measure aggregation.');

    const isPieDonut = c.chartType === 'pie' || c.chartType === 'donut';
    if (
      !isPieDonut &&
      c.seriesField &&
      isDateFieldName(catalog, c.seriesField) &&
      !c.seriesGranularity
    ) {
      errors.push('Select a granularity for the date series.');
    }
  } else {
    const t = state.table;
    if (t.tableMode === 'raw') {
      if (t.raw.columns.length === 0) errors.push('Add at least one column.');
    } else {
      const completeRows = t.agg.rows.filter((g) => g.field);
      const completeColumns = t.agg.columns.filter((g) => g.field);
      const completeMeasures = t.agg.measures.filter(
        (m) => m.field && m.aggregation,
      );
      if (completeRows.length === 0) {
        errors.push('Add at least one row dimension.');
      }
      if (completeMeasures.length === 0) errors.push('Add at least one measure.');
      const dateMissingGran = [...completeRows, ...completeColumns].some(
        (g) => isDateFieldName(catalog, g.field) && !g.granularity,
      );
      if (dateMissingGran) {
        errors.push('Select a granularity for each date dimension.');
      }
      const rowFields = new Set(completeRows.map((g) => g.field));
      if (completeColumns.some((g) => rowFields.has(g.field))) {
        errors.push('A field cannot be used in both rows and columns.');
      }
    }
  }

  return errors;
}

export function isMinimalValid(
  state: BuilderState,
  catalog: DatasourceCatalog,
): boolean {
  return validationErrors(state, catalog).length === 0;
}
