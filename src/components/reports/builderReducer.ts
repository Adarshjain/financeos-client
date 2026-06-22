// Central state for the report builder. One reducer holds the shared bits
// (name, description, filters) at the top level plus an independent draft per
// report type, so switching `type` never discards work on the other types.

import type {
  Aggregation,
  ChartDefinition,
  DatasourceCatalog,
  FilterClause,
  Granularity,
  KpiDefinition,
  ReportResponse,
  ReportType,
  SortClause,
  TableDefinition,
} from '@/lib/reports.types';

import { defaultExcludedFilter } from './catalog';

/** The single datasource exposed by the catalog today. */
export const DATASOURCE = 'transactions';

export interface KpiDraft {
  measure?: string;
  aggregation?: Aggregation;
  comparisonEnabled: boolean; // on by default; serialized to { enabled: false } when off
  /** undefined = no preference (neutral); true/false drive the delta sentiment. */
  higherIsBetter?: boolean;
}

export interface ChartDraft {
  chartType: ChartDefinition['chartType'];
  dimensionField?: string;
  dimensionGranularity?: Granularity;
  seriesField?: string;
  seriesGranularity?: Granularity;
  measureField?: string;
  measureAggregation?: Aggregation;
}

export interface RawTableDraft {
  columns: string[];
  sort: SortClause[];
}

// Drafts allow incomplete selections while the user is building; serialize.ts
// drops the incomplete ones before producing the wire shape.
export interface DimensionDraft {
  field?: string;
  granularity?: Granularity;
}

export interface MeasureDraft {
  field?: string;
  aggregation?: Aggregation;
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
): BuilderState {
  // New reports default to hiding excluded transactions via a regular filter
  // clause the user can edit or remove. Edit mode passes no catalog and loads
  // the saved filters instead.
  const seedFilter = catalog ? defaultExcludedFilter(catalog) : null;
  return {
    mode: 'create',
    name: '',
    description: '',
    datasource: DATASOURCE,
    type,
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
    case 'CHART_SET':
      return { ...state, chart: { ...state.chart, ...action.value } };
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
    const d = def as KpiDefinition;
    state.kpi = {
      measure: d.measure,
      aggregation: d.aggregation,
      comparisonEnabled: d.comparison?.enabled !== false,
      higherIsBetter: d.comparison?.higherIsBetter,
    };
  } else if (report.type === 'CHART') {
    const d = def as ChartDefinition;
    state.chart = {
      chartType: d.chartType,
      dimensionField: d.dimension?.field,
      dimensionGranularity: d.dimension?.granularity,
      seriesField: d.series?.field,
      seriesGranularity: d.series?.granularity,
      measureField: d.measure?.field,
      measureAggregation: d.measure?.aggregation,
    };
  } else {
    const d = def as TableDefinition;
    if (d.mode === 'raw') {
      state.table.tableMode = 'raw';
      state.table.raw = {
        columns: d.columns ?? [],
        sort: d.sort ?? [],
      };
    } else {
      state.table.tableMode = 'aggregated';
      state.table.agg = {
        rows: d.rows ?? [],
        columns: d.columns ?? [],
        measures: d.measures ?? [],
        sort: d.sort ?? [],
      };
    }
  }
  return state;
}
