// Central state for the report builder. One reducer holds the shared bits
// (name, description, filters) at the top level plus an independent draft per
// report type, so switching `type` never discards work on the other types.

import {
  isChartDefinition,
  isKpiDefinition,
  isTableDefinition,
} from '@/lib/reports.helpers';
import type {
  Aggregation,
  BreakdownBars,
  BreakdownColumn,
  ChartDefinition,
  ChartOrder,
  ComparisonDisplay,
  DatasourceCatalog,
  FilterClause,
  Granularity,
  ReportResponse,
  ReportType,
  SortClause,
} from '@/lib/reports.types';

import { defaultExcludedFilter } from './catalog';



export interface KpiDraft {
  measure?: string;
  aggregation?: Aggregation;
  comparisonEnabled: boolean; // on by default here (the /ds editor starts it off); serialized to { enabled: false } when off
  /** undefined = no preference (neutral); true/false drive the delta sentiment. */
  higherIsBetter?: boolean;
  /** undefined = the default (`change`); only `previous_value` is serialized. */
  comparisonDisplay?: ComparisonDisplay;
}

export interface ChartDraft {
  chartType: ChartDefinition['chartType'];
  dimensionField?: string;
  dimensionGranularity?: Granularity;
  seriesField?: string;
  seriesGranularity?: Granularity;
  measureField?: string;
  measureAggregation?: Aggregation;
  /** Top N (1..50); undefined = every category. */
  limit?: number;
  /** With `limit`: fold the rest into "Other". */
  other?: boolean;
  /** undefined = the default order (by dimension; high to low for a breakdown). */
  order?: ChartOrder;
  /** Off unless set; never on for a date dimension (serialize drops it). */
  comparisonEnabled?: boolean;
  /** undefined = no preference (neutral). */
  comparisonHigherIsBetter?: boolean;
  /** undefined = the default (`change`); only `previous_value` is serialized. */
  comparisonDisplay?: ComparisonDisplay;
  /** Breakdown only: the sub-rows' dimension. */
  subDimensionField?: string;
  subDimensionGranularity?: Granularity;
  /** Breakdown only: sub-rows per row (1..10); undefined = the server default (3). */
  subLimit?: number;
  /** Breakdown only: the value columns; undefined = the default (amount, share, and change when comparing). */
  columns?: BreakdownColumn[];
  /** Breakdown only: undefined = relative to the largest row. */
  bars?: BreakdownBars;
}

export interface RawTableDraft {
  columns: string[];
  sort: SortClause[];
}

// Drafts allow incomplete selections while the user is building; serialize.ts
// drops the incomplete ones before producing the wire shape.
//
// `id` is a client-only handle so the editor lists can be keyed by identity
// rather than array index. With index keys, deleting a row mid-list made React
// reuse the row below's Radix Select instance, which could visibly carry an open
// dropdown or focus onto different data. Safe to keep in state because
// serializeDefinition rebuilds every dimension/measure via dimRef and explicit
// literals, so `id` never reaches the wire. (Filters and sort clauses are NOT
// given ids: those arrays are passed through to the payload as-is.)
export interface DimensionDraft {
  id: string;
  field?: string;
  granularity?: Granularity;
}

export interface MeasureDraft {
  id: string;
  field?: string;
  aggregation?: Aggregation;
}

/** A fresh client id for a new draft row. */
export function newDraftId(): string {
  return crypto.randomUUID();
}

export interface AggTableDraft {
  rows: DimensionDraft[];
  columns: DimensionDraft[];
  measures: MeasureDraft[];
  sort: SortClause[];
}

export interface TableDraft {
  tableMode: 'raw' | 'aggregated';
  raw: RawTableDraft;
  agg: AggTableDraft;
}

export interface BuilderState {
  mode: 'create' | 'edit';
  reportId?: string;
  name: string;
  description: string;
  datasource: string;
  type: ReportType;
  // Shared across types — survive a type switch:
  filters: FilterClause[];
  // Independent per-type drafts:
  kpi: KpiDraft;
  chart: ChartDraft;
  table: TableDraft;
}

export type BuilderAction =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_DESCRIPTION'; value: string }
  | { type: 'SET_TYPE'; value: ReportType }
  | { type: 'SET_DATASOURCE'; value: string; catalog?: DatasourceCatalog }
  | { type: 'ADD_FILTER'; value: FilterClause }
  | { type: 'UPDATE_FILTER'; index: number; value: FilterClause }
  | { type: 'REMOVE_FILTER'; index: number }
  | { type: 'KPI_SET'; value: Partial<KpiDraft> }
  | { type: 'CHART_SET'; value: Partial<ChartDraft> }
  | { type: 'TABLE_SET'; value: Partial<TableDraft> }
  | { type: 'TABLE_SET_RAW'; value: Partial<RawTableDraft> }
  | { type: 'TABLE_SET_AGG'; value: Partial<AggTableDraft> };

export function initialBuilderState(
  type: ReportType = 'KPI',
  catalog?: DatasourceCatalog,
  datasource = 'transactions',
  /** The KPI's comparison on a new draft: on for the Legacy builder, off (Show: None) for the /ds editor. */
  kpiComparison = true,
): BuilderState {
  // New reports on transactions default to hiding excluded transactions.
  // Other datasources start with no filters. Edit mode passes no catalog.
  const seedFilter = catalog && datasource === 'transactions' ? defaultExcludedFilter(catalog) : null;
  return {
    mode: 'create',
    name: '',
    description: '',
    datasource,
    type,
    filters: seedFilter ? [seedFilter] : [],
    kpi: { comparisonEnabled: kpiComparison },
    chart: { chartType: 'bar' },
    table: {
      tableMode: 'raw',
      raw: { columns: [], sort: [] },
      agg: { rows: [], columns: [], measures: [], sort: [] },
    },
  };
}

export function builderReducer(
  state: BuilderState,
  action: BuilderAction,
): BuilderState {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.value };
    case 'SET_DESCRIPTION':
      return { ...state, description: action.value };
    case 'SET_TYPE':
      return { ...state, type: action.value };
    case 'SET_DATASOURCE': {
      if (state.mode === 'edit') return state;
      const newDs = action.value;
      const seedFilter = newDs === 'transactions' && action.catalog ? defaultExcludedFilter(action.catalog) : null;
      return {
        ...state,
        datasource: newDs,
        filters: seedFilter ? [seedFilter] : [],
        kpi: { comparisonEnabled: true },
        chart: { chartType: 'bar' },
        table: {
          tableMode: 'raw',
          raw: { columns: [], sort: [] },
          agg: { rows: [], columns: [], measures: [], sort: [] },
        },
      };
    }
    case 'ADD_FILTER':
      return { ...state, filters: [...state.filters, action.value] };
    case 'UPDATE_FILTER':
      return {
        ...state,
        filters: state.filters.map((f, i) =>
          i === action.index ? action.value : f,
        ),
      };
    case 'REMOVE_FILTER':
      return {
        ...state,
        filters: state.filters.filter((_, i) => i !== action.index),
      };
    case 'KPI_SET':
      return { ...state, kpi: { ...state.kpi, ...action.value } };
    case 'CHART_SET': {
      const chart = { ...state.chart, ...action.value };
      // Sub-rows cannot be the rows' own field: choosing it as the dimension drops the sub-dimension.
      if (action.value.dimensionField !== undefined && action.value.dimensionField === chart.subDimensionField) {
        chart.subDimensionField = undefined;
        chart.subDimensionGranularity = undefined;
      }
      // Columns and bars belong to a breakdown only.
      if (chart.chartType !== 'breakdown') {
        chart.columns = undefined;
        chart.bars = undefined;
      }
      // "Change" needs a comparison: turning it off drops the column, and an emptied list is the default again.
      if (!chart.comparisonEnabled && chart.columns?.includes('change')) {
        const rest = chart.columns.filter((c) => c !== 'change');
        chart.columns = rest.length > 0 ? rest : undefined;
      }
      return { ...state, chart };
    }
    case 'TABLE_SET':
      return { ...state, table: { ...state.table, ...action.value } };
    case 'TABLE_SET_RAW':
      return {
        ...state,
        table: { ...state.table, raw: { ...state.table.raw, ...action.value } },
      };
    case 'TABLE_SET_AGG':
      return {
        ...state,
        table: { ...state.table, agg: { ...state.table.agg, ...action.value } },
      };
    default:
      return state;
  }
}

/** Reverse-map a saved report into builder state for edit mode. */
export function hydrateState(report: ReportResponse): BuilderState {
  const state = initialBuilderState(report.type);
  state.mode = 'edit';
  state.reportId = report.id;
  state.name = report.name;
  state.description = report.description ?? '';
  state.datasource = report.datasource;
  state.type = report.type;

  const def = report.definition;
  state.filters = def.filters ?? [];

  if (report.type === 'KPI') {
    // Validated rather than cast: see the guards in reports.helpers. A
    // type/definition mismatch used to load an object of `undefined` fields, so
    // the builder silently opened blank instead of reporting that the saved
    // report could not be read. Throwing surfaces it in the route error
    // boundary with a retry.
    if (!isKpiDefinition(def)) {
      throw new Error(
        `Report ${report.id} is typed KPI but its definition does not match a KPI report.`,
      );
    }
    const d = def;
    state.kpi = {
      measure: d.measure,
      aggregation: d.aggregation,
      comparisonEnabled: d.comparison?.enabled !== false,
      higherIsBetter: d.comparison?.higherIsBetter,
      comparisonDisplay: d.comparison?.display,
    };
  } else if (report.type === 'CHART') {
    if (!isChartDefinition(def)) {
      throw new Error(
        `Report ${report.id} is typed CHART but its definition does not match a CHART report.`,
      );
    }
    const d = def;
    state.chart = {
      chartType: d.chartType,
      dimensionField: d.dimension?.field,
      dimensionGranularity: d.dimension?.granularity,
      seriesField: d.series?.field,
      seriesGranularity: d.series?.granularity,
      measureField: d.measure?.field,
      measureAggregation: d.measure?.aggregation,
      limit: d.limit,
      other: d.other,
      order: d.order,
      comparisonEnabled: d.comparison?.enabled === true ? true : undefined,
      comparisonHigherIsBetter: d.comparison?.higherIsBetter,
      comparisonDisplay: d.comparison?.display,
      subDimensionField: d.subDimension?.field,
      subDimensionGranularity: d.subDimension?.granularity,
      subLimit: d.subLimit,
      columns: d.columns ?? undefined,
      bars: d.bars ?? undefined,
    };
  } else {
    if (!isTableDefinition(def)) {
      throw new Error(
        `Report ${report.id} is typed TABLE but its definition declares no raw/aggregated mode.`,
      );
    }
    const d = def;
    if (d.mode === 'raw') {
      state.table.tableMode = 'raw';
      state.table.raw = {
        columns: d.columns ?? [],
        sort: d.sort ?? [],
      };
    } else {
      state.table.tableMode = 'aggregated';
      state.table.agg = {
        // Saved definitions carry no client id, so mint one per loaded row.
        rows: (d.rows ?? []).map((r) => ({ ...r, id: newDraftId() })),
        columns: (d.columns ?? []).map((c) => ({ ...c, id: newDraftId() })),
        measures: (d.measures ?? []).map((m) => ({ ...m, id: newDraftId() })),
        sort: d.sort ?? [],
      };
    }
  }
  return state;
}
