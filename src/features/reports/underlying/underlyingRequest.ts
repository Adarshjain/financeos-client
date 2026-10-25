// Builds the ad-hoc KPI request that lists the rows behind a figure of a report: the report's measure and
// aggregation, its filters, plus one clause pinning the row that was opened (a chart or breakdown category,
// an aggregated-table row). There is no chart-category endpoint, so every entry point goes through the
// ad-hoc KPI underlying endpoint. A row that cannot be pinned exactly (the "Other" slot, a missing value, a
// date bucket without a known window, a date row of a table) has no underlying: the builders return null.

import { labelChartData } from '@/lib/reports.helpers';
import type {
  Aggregation,
  ChartData,
  ChartDefinition,
  DatasourceCatalog,
  FilterClause,
  KpiDefinition,
  PivotTableData,
  ReportDefinition,
  RunReportRequest,
  TableDefinitionAggregated,
} from '@/lib/reports.types';

/** What a missing value reads as in the report's own results. */
const NONE_LABEL = '(none)';

interface Measure {
  field: string;
  aggregation: Aggregation;
}

/** The measure a report's figure is made of; a raw table has none. */
function measureOf(definition: ReportDefinition): Measure | null {
  // A KPI names its measure by field and carries the aggregation beside it; a chart has `{ field, aggregation }`.
  if ('aggregation' in definition) return { field: definition.measure, aggregation: definition.aggregation };
  if ('chartType' in definition) return definition.measure;
  if (definition.mode === 'aggregated') return definition.measures[0] ?? null;
  return null;
}

function kpiRequest(
  request: RunReportRequest,
  measure: Measure,
  filters: FilterClause[],
  comparison?: KpiDefinition['comparison'],
): RunReportRequest {
  const definition: KpiDefinition = { measure: measure.field, aggregation: measure.aggregation, filters };
  if (comparison) definition.comparison = comparison;
  return { type: 'KPI', datasource: request.datasource, definition };
}

const filtersOf = (definition: ReportDefinition): FilterClause[] => [...(definition.filters ?? [])];

/** Whether a report has a figure whose rows can be listed (a KPI, a chart or an aggregated table). */
export function hasUnderlying(request: RunReportRequest): boolean {
  return measureOf(request.definition) !== null;
}

/** The rows behind the whole report's figure: a KPI as it is; a chart or aggregated table by its measure and filters. */
export function wholeReportRequest(request: RunReportRequest): RunReportRequest | null {
  const measure = measureOf(request.definition);
  if (!measure) return null;
  if (request.type === 'KPI') return { ...request, definition: { ...request.definition } };
  return kpiRequest(request, measure, filtersOf(request.definition));
}

const field = (catalog: DatasourceCatalog, name: string) => catalog.fields.find((f) => f.name === name);

/** An exact-match clause for one stored value of a non-date field; null when the value or the field cannot be pinned. */
function pinClause(catalog: DatasourceCatalog, name: string, raw: string | null | undefined): FilterClause | null {
  if (raw === null || raw === undefined || raw === '' || raw === NONE_LABEL) return null;
  const f = field(catalog, name);
  if (!f) return null;
  switch (f.type) {
    case 'enum':
      return { field: name, operator: 'is', value: raw };
    case 'string':
      return { field: name, operator: 'exact', value: raw };
    case 'number': {
      const n = Number(raw);
      return Number.isFinite(n) ? { field: name, operator: 'equals', value: n } : null;
    }
    case 'boolean':
      return { field: name, operator: catalog.operators.boolean[0] ?? 'is', value: raw === 'true' };
    default:
      return null;
  }
}

/**
 * The rows behind category `index` of a chart or breakdown. A non-date dimension pins the category's stored
 * value; a date dimension pins the window the category covers. With `seriesName` on a chart that has a series,
 * that series' value is pinned as well. A date window turns the period comparison off: the pin is one fixed
 * window, so a "previous period" of it is meaningless.
 */
export function categoryRequest(
  request: RunReportRequest,
  data: ChartData,
  index: number,
  catalog: DatasourceCatalog,
  seriesName?: string,
): RunReportRequest | null {
  const definition = request.definition as ChartDefinition;
  const measure = measureOf(definition);
  if (!measure || !definition.dimension) return null;
  if (data.other?.index === index) return null;

  let filters = filtersOf(definition);
  const dimension = field(catalog, definition.dimension.field);
  let comparison: KpiDefinition['comparison'];
  if (dimension?.type === 'date') {
    const range = data.categoryRanges?.[index];
    if (!range) return null;
    // The server reads the period from the first date filter, so the pin replaces the report's own date filters on
    // this field (the header and CSV name must show the bucket); date filters on other fields stay.
    filters = filters.filter((f) => f.field !== definition.dimension.field);
    filters.push({ field: definition.dimension.field, operator: 'between', value: { from: range.from, to: range.to } });
    comparison = { enabled: false };
  } else {
    const clause = pinClause(catalog, definition.dimension.field, data.categories[index]);
    if (!clause) return null;
    filters.push(clause);
  }

  if (seriesName !== undefined && definition.series) {
    const series = field(catalog, definition.series.field);
    // A date series has no window to pin.
    if (series?.type === 'date') return null;
    const clause = pinClause(catalog, definition.series.field, seriesName);
    if (!clause) return null;
    filters.push(clause);
  }
  return kpiRequest(request, measure, filters, comparison);
}

/** One entry of the Underlying data dialog's dimension dropdown: a category and the request of the rows behind it. */
export interface UnderlyingEntry {
  /** The category as the report prints it. */
  label: string;
  request: RunReportRequest;
  /** The category's index in the result it came from (categoryEntries sets it). */
  index?: number;
}

/** Every category of a chart or breakdown whose rows can be listed (not "Other", not one that cannot be pinned), in order. */
export function categoryEntries(
  request: RunReportRequest,
  data: ChartData,
  catalog: DatasourceCatalog,
): UnderlyingEntry[] {
  const labelled = labelChartData(data);
  return data.categories.flatMap((_, index) => {
    const entry = categoryRequest(request, data, index, catalog);
    return entry ? [{ label: labelled.categories[index], request: entry, index }] : [];
  });
}

/**
 * The rows behind one row of an aggregated table: its group-by values, all pinned. A row with a date or missing
 * group value has no underlying (a date row's window is not part of the result). The first measure is the figure.
 */
export function tableRowRequest(
  request: RunReportRequest,
  data: PivotTableData,
  rowKey: string,
  catalog: DatasourceCatalog,
): RunReportRequest | null {
  const definition = request.definition as TableDefinitionAggregated;
  const measure = measureOf(definition);
  const row = data.rows.find((r) => r.key === rowKey);
  if (!measure || !row) return null;
  const filters = filtersOf(definition);
  for (const dim of data.rowDimensions) {
    const clause = pinClause(catalog, dim.field, row.values[dim.field]);
    if (!clause) return null;
    filters.push(clause);
  }
  return kpiRequest(request, measure, filters);
}
