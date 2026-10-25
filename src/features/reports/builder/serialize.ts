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

import { defaultBreakdownColumns, sameColumns } from './breakdownColumns';
import type { BuilderState } from './builderReducer';
import { fieldByName, isDateFieldName, valueKind } from './catalog';

/** Whether a filter clause has a value appropriate to its operator. */
export function isFilterComplete(
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

/** A series split makes no sense for pie, donut (slices) or breakdown (rows). */
export function hasSeries(chartType: ChartDefinition['chartType']): boolean {
  return chartType !== 'pie' && chartType !== 'donut' && chartType !== 'breakdown';
}

export const TOP_N_MAX = 50;
export const SUB_LIMIT_MAX = 10;

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
    // OFF, to express a higher-is-better preference (drives the sentiment), or
    // to show the previous period's value instead of the change.
    const comparison: NonNullable<KpiDefinition['comparison']> = {};
    if (!k.comparisonEnabled) comparison.enabled = false;
    if (k.higherIsBetter !== undefined) comparison.higherIsBetter = k.higherIsBetter;
    if (k.comparisonDisplay === 'previous_value') comparison.display = 'previous_value';
    if (Object.keys(comparison).length > 0) def.comparison = comparison;
    return def;
  }

  if (state.type === 'CHART') {
    const c = state.chart;
    const isBreakdown = c.chartType === 'breakdown';
    const def: ChartDefinition = {
      chartType: c.chartType,
      dimension: dimRef(catalog, c.dimensionField ?? '', c.dimensionGranularity),
      measure: {
        field: c.measureField ?? '',
        aggregation: c.measureAggregation ?? 'sum',
      },
      filters,
    };
    if (hasSeries(c.chartType) && c.seriesField) {
      def.series = dimRef(catalog, c.seriesField, c.seriesGranularity);
    }
    if (c.limit !== undefined) {
      def.limit = c.limit;
      if (c.other) def.other = true;
    }
    if (c.order) def.order = c.order;
    // A comparison shifts the date window, so it is meaningless (and dropped) on a date dimension.
    if (c.comparisonEnabled && !isDateFieldName(catalog, c.dimensionField)) {
      const comparison: NonNullable<ChartDefinition['comparison']> = { enabled: true, period: 'previous_period' };
      if (c.comparisonHigherIsBetter !== undefined) comparison.higherIsBetter = c.comparisonHigherIsBetter;
      if (c.comparisonDisplay === 'previous_value') comparison.display = 'previous_value';
      def.comparison = comparison;
    }
    if (isBreakdown && c.subDimensionField) {
      def.subDimension = dimRef(catalog, c.subDimensionField, c.subDimensionGranularity);
      if (c.subLimit !== undefined) def.subLimit = c.subLimit;
    }
    // Columns and bars go out only when they differ from the default, so older reports stay as they were.
    // "Change" is dropped when no comparison goes out (the server rejects it then).
    const columns = isBreakdown ? c.columns?.filter((col) => col !== 'change' || def.comparison?.enabled) : undefined;
    // Equal to the default for the comparison actually sent (as a set) means "unset", so older reports stay as they were.
    if (columns && columns.length > 0 && !sameColumns(columns, defaultBreakdownColumns(!!def.comparison?.enabled))) {
      def.columns = columns;
    }
    if (isBreakdown && c.bars && c.bars !== 'relative_to_largest') def.bars = c.bars;
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

/** The part of the editor a validation message belongs to, so it can show at that field. */
export type IssueKey =
  | 'measure'
  | 'aggregation'
  | 'dimension'
  | 'series'
  | 'limit'
  | 'subDimension'
  | 'subLimit'
  | 'columns'
  | 'breakdownColumns'
  | 'rows'
  | 'tableColumns'
  | 'measures'
  | 'filters';

export interface ValidationIssue {
  key: IssueKey;
  message: string;
}

/** Reasons the current definition cannot be run/saved yet, each with the field it belongs to. */
export function validationIssues(
  state: BuilderState,
  catalog: DatasourceCatalog,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (key: IssueKey, message: string) => issues.push({ key, message });

  if (state.type === 'KPI') {
    const k = state.kpi;
    if (!k.measure) add('measure', 'Select a measure.');
    if (!k.aggregation) add('aggregation', 'Select an aggregation.');
  } else if (state.type === 'CHART') {
    const c = state.chart;
    if (!c.dimensionField) {
      add('dimension', 'Select a dimension.');
    } else if (isDateFieldName(catalog, c.dimensionField) && !c.dimensionGranularity) {
      add('dimension', 'Select a granularity for the date dimension.');
    }
    if (!c.measureField) add('measure', 'Select a measure.');
    else if (!c.measureAggregation) add('aggregation', 'Select a measure aggregation.');

    if (
      hasSeries(c.chartType) &&
      c.seriesField &&
      isDateFieldName(catalog, c.seriesField) &&
      !c.seriesGranularity
    ) {
      add('series', 'Select a granularity for the date series.');
    }
  } else {
    const t = state.table;
    if (t.tableMode === 'raw') {
      if (t.raw.columns.length === 0) add('tableColumns', 'Add at least one column.');
    } else {
      const completeRows = t.agg.rows.filter((g) => g.field);
      const completeColumns = t.agg.columns.filter((g) => g.field);
      const completeMeasures = t.agg.measures.filter(
        (m) => m.field && m.aggregation,
      );
      if (completeRows.length === 0) {
        add('rows', 'Add at least one row dimension.');
      }
      if (completeMeasures.length === 0) add('measures', 'Add at least one measure.');
      const dateMissingGran = [...completeRows, ...completeColumns].some(
        (g) => isDateFieldName(catalog, g.field) && !g.granularity,
      );
      if (dateMissingGran) {
        add('rows', 'Select a granularity for each date dimension.');
      }
      const rowFields = new Set(completeRows.map((g) => g.field));
      if (completeColumns.some((g) => rowFields.has(g.field))) {
        add('columns', 'A field cannot be used in both rows and columns.');
      }
      // Within-list duplicates were never checked, so the same dimension could
      // be grouped on twice in one axis, or the same field aggregated twice the
      // same way.
      if (rowFields.size !== completeRows.length) {
        add('rows', 'Each row dimension must be a different field.');
      }
      const columnFieldSet = new Set(completeColumns.map((g) => g.field));
      if (columnFieldSet.size !== completeColumns.length) {
        add('columns', 'Each column dimension must be a different field.');
      }
      const measureKeys = new Set(
        completeMeasures.map((m) => `${m.field}:${m.aggregation}`),
      );
      if (measureKeys.size !== completeMeasures.length) {
        add('measures', 'Each measure must be a different field/aggregation pair.');
      }
    }
  }

  if (state.type === 'CHART') {
    const c = state.chart;
    if (c.limit !== undefined && !(Number.isInteger(c.limit) && c.limit >= 1 && c.limit <= TOP_N_MAX)) {
      add('limit', `Top N must be a whole number from 1 to ${TOP_N_MAX}.`);
    }
    if (c.chartType === 'breakdown' && c.subDimensionField) {
      if (c.subDimensionField === c.dimensionField) add('subDimension', 'Sub-rows must differ from rows.');
      if (isDateFieldName(catalog, c.subDimensionField) && !c.subDimensionGranularity) {
        add('subDimension', 'Select a granularity for the date sub-rows.');
      }
      if (c.subLimit !== undefined && !(Number.isInteger(c.subLimit) && c.subLimit >= 1 && c.subLimit <= SUB_LIMIT_MAX)) {
        add('subLimit', `Sub-rows must be a whole number from 1 to ${SUB_LIMIT_MAX}.`);
      }
    }
    if (c.chartType === 'breakdown' && c.columns && c.columns.length === 0) add('breakdownColumns', 'Select at least one column.');
  }

  for (const message of billingCycleErrors(state, catalog)) add('filters', message);
  return issues;
}

/** Reasons the current definition cannot be run/saved yet (for inline hints). */
export function validationErrors(
  state: BuilderState,
  catalog: DatasourceCatalog,
): string[] {
  return validationIssues(state, catalog).map((i) => i.message);
}

/** Fields the definition groups or lists by (dimensions, series, rows, columns). */
function groupedFieldNames(state: BuilderState): string[] {
  if (state.type === 'CHART') {
    const c = state.chart;
    return [c.dimensionField, hasSeries(c.chartType) ? c.seriesField : undefined, c.chartType === 'breakdown' ? c.subDimensionField : undefined].filter((f): f is string => !!f);
  }
  if (state.type === 'TABLE') {
    const t = state.table;
    return t.tableMode === 'raw'
      ? t.raw.columns
      : [...t.agg.rows, ...t.agg.columns].map((g) => g.field).filter((f): f is string => !!f);
  }
  return [];
}

/**
 * Billing cycles differ per account, so a billing-cycle filter or grouping needs exactly one
 * single-value filter on the datasource's account field (the server enforces the same rule).
 */
function billingCycleErrors(state: BuilderState, catalog: DatasourceCatalog): string[] {
  const cycleOps = catalog.operators?.date?.cycle ?? [];
  const usesCycle =
    state.filters.some((f) => cycleOps.includes(f.operator)) ||
    groupedFieldNames(state).some((name) => {
      const field = catalog.fields.find((f) => f.name === name);
      return !!field?.billingCycle && field.type !== 'date';
    });
  if (!usesCycle) return [];

  const accountField = catalog.billingCycleAccountField;
  if (!accountField) return ['Billing cycles are not available for this datasource.'];
  const label = catalog.fields.find((f) => f.name === accountField)?.label ?? accountField;
  const accountFilters = state.filters.filter((f) => f.field === accountField);
  const single = (f: (typeof accountFilters)[number]) =>
    (f.operator === 'is' && typeof f.value === 'string' && f.value !== '') ||
    (f.operator === 'in' && Array.isArray(f.value) && f.value.length === 1);
  if (accountFilters.length !== 1 || !single(accountFilters[0])) {
    return [`Billing cycles differ per account: add one "${label} is …" filter.`];
  }
  return [];
}

export function isMinimalValid(
  state: BuilderState,
  catalog: DatasourceCatalog,
): boolean {
  return validationErrors(state, catalog).length === 0;
}
