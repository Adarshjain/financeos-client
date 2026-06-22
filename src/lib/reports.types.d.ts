// Types generated from API spec — Reports module
// See api-spec.yaml (tags: Reports) for the wire contract.

/** The kind of report. Always UPPERCASE on the wire. */
export type ReportType = 'KPI' | 'CHART' | 'TABLE';

/** The data type of a catalog field; drives which operators apply. */
export type FieldType = 'number' | 'date' | 'string' | 'enum' | 'boolean';

/**
 * What a field can do in the builder:
 * - `measure`   → can be aggregated (KPI value, chart/table measure)
 * - `dimension` → can be grouped / used as an axis / column
 * - `filter`    → filter-only, never displayed
 */
export type FieldRole = 'measure' | 'dimension' | 'filter';

/** Aggregation functions a measure field may support. */
export type Aggregation = 'sum' | 'avg' | 'count' | 'min' | 'max';

/** Time bucketing applied to a date dimension. */
export type Granularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

// ---------------------------------------------------------------------------
// 1. Datasource catalog — GET /api/v1/report/datasource
// ---------------------------------------------------------------------------

/** A reportable field in the datasource catalog. */
export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  role: FieldRole;
  /** Present for measures only. */
  aggregations?: Aggregation[];
  /** Allowed values for STATIC enum fields only. */
  values?: string[];
  /**
   * True for user-specific enums (e.g. `category`, `account`); these ship no
   * `values` — fetch options from their own endpoints (`/api/v1/categories`,
   * `/api/v1/accounts`) and filter by the option's name.
   */
  dynamic?: boolean;
  /**
   * Which report types may DISPLAY / GROUP-BY this field. Does not restrict
   * filtering — any field can be filtered regardless of this list.
   */
  allowedInReports: ReportType[];
}

/** Operators available per field type. Date operators split absolute vs relative. */
export interface OperatorCatalog {
  date: { absolute: string[]; relative: string[] };
  string: string[];
  number: string[];
  enum: string[];
  boolean: string[];
}

/**
 * The reportable field and operator catalog used to build report definitions.
 * Wire schema: `DatasourceView`.
 */
export interface DatasourceCatalog {
  fields: FieldDefinition[];
  operators: OperatorCatalog;
}

// ---------------------------------------------------------------------------
// 2. Report definition — shared building blocks
// ---------------------------------------------------------------------------

/**
 * The value carried by a filter; its shape depends on the operator:
 * - scalar ops (`is`, `equals`, `greater_than`, `after`, `contains`, …) → `string | number | boolean`
 * - `in` / `not_in` → `string[]`
 * - date `between` → `{ from: string; to: string }` (ISO `yyyy-MM-dd`)
 * - number `between` → `{ from: number; to: number }`
 * - parameterised relative date (`last_x_days` / `last_x_months` / `last_x_years`) → `{ amount: number }`
 * - valueless relative ops (`this_month`, `today`, `current_fy`, `all_time`, …) → omit `value` entirely
 */
export type FilterValue =
  | string
  | number
  | boolean
  | string[]
  | { from: string; to: string }
  | { from: number; to: number }
  | { amount: number };

/** A single filter clause. Filters in an array are AND-ed together. */
export interface FilterClause {
  /** A field name from the catalog. */
  field: string;
  /** An operator valid for that field's type. */
  operator: string;
  /** Shape depends on the operator; omit for valueless operators. */
  value?: FilterValue;
}

/** Sort instruction; `key` references a column/field or aggregated column key. */
export interface SortClause {
  key: string;
  direction: 'asc' | 'desc';
}

/** A dimension reference; `granularity` is REQUIRED iff `field` is a date. */
export interface DimensionRef {
  field: string;
  granularity?: Granularity;
}

/** A measure reference: a measure field plus the aggregation to apply. */
export interface MeasureRef {
  field: string;
  aggregation: Aggregation;
}

// ---------------------------------------------------------------------------
// 2a. Type-specific definitions — the `definition` payload by report type
// ---------------------------------------------------------------------------

/** KPI: a single aggregated value, optionally compared to the previous period. */
export interface KpiDefinition {
  /** A measure field (e.g. `amount`). */
  measure: string;
  aggregation: Aggregation;
  filters: FilterClause[];
  /**
   * Period-over-period comparison. On by default server-side; send
   * `{ enabled: false }` to turn it off. `higherIsBetter` drives the response
   * `sentiment`: an increase reads `good` when true and `bad` when false; when
   * unset the change is `neutral`. Null in the response when the range is
   * unbounded / `all_time`.
   */
  comparison?: {
    enabled?: boolean;
    higherIsBetter?: boolean;
    period?: 'previous_period';
  };
}

/** CHART: one measure over a dimension, optionally split into series. */
export interface ChartDefinition {
  chartType: 'line' | 'bar' | 'stackedBar' | 'area' | 'pie' | 'donut';
  /** X-axis / primary grouping. */
  dimension: DimensionRef;
  /** Optional split into multiple series; ignored for `pie`/`donut`. */
  series?: DimensionRef;
  /** Single measure (v1). */
  measure: MeasureRef;
  filters: FilterClause[];
  // No sort, no limit — charts are not sorted server-side; cap points/series
  // client-side if needed.
}

/** TABLE (raw): per-transaction rows for the selected columns. */
export interface TableDefinitionRaw {
  mode: 'raw';
  /** Field names; array order = column order. */
  columns: string[];
  filters: FilterClause[];
  /** Default sort; keys are column (field) names. Page size is a runtime param. */
  sort?: SortClause[];
}

/** TABLE (aggregated): a pivot — row dimensions × column dimensions × measures. */
export interface TableDefinitionAggregated {
  mode: 'aggregated';
  /** 1+ dimensions grouped down the left of the pivot. */
  rows: DimensionRef[];
  /** 0+ dimensions grouped across the top; omit/empty = flat rows × measures. */
  columns: DimensionRef[];
  /** 1+ measures. */
  measures: MeasureRef[];
  filters: FilterClause[];
  /**
   * Keys: a row dimension field, or a measure key `${field}_${aggregation}`
   * (a measure key is only valid when `columns` is empty). Page size is a
   * runtime param.
   */
  sort?: SortClause[];
}

/** A table definition is raw OR aggregated, discriminated by `mode`. */
export type TableDefinition = TableDefinitionRaw | TableDefinitionAggregated;

/**
 * A report definition is one of three mutually exclusive shapes. The owning
 * report's `type` (`KPI`/`CHART`/`TABLE`) selects which variant applies.
 */
export type ReportDefinition =
  | KpiDefinition
  | ChartDefinition
  | TableDefinition;

// ---------------------------------------------------------------------------
// 3. Requests / responses
// ---------------------------------------------------------------------------

export interface CreateReportRequest {
  name: string;
  /** Optional free-text description. */
  description?: string | null;
  type: ReportType;
  datasource: string;
  definition: ReportDefinition;
}

/** Update name + definition only; `type` and `datasource` are immutable. */
export interface UpdateReportRequest {
  name: string;
  /** Optional free-text description. */
  description?: string | null;
  definition: ReportDefinition;
}

/** Run an unsaved definition for live preview. */
export interface RunReportRequest {
  type: ReportType;
  datasource: string;
  definition: ReportDefinition;
}

/** Full saved report, including its definition. */
export interface ReportResponse {
  id: string;
  name: string;
  description?: string | null;
  type: ReportType;
  datasource: string;
  definition: ReportDefinition;
  createdAt: string;
  updatedAt: string;
}

/** List-view report metadata (no definition). */
export interface ReportSummaryResponse {
  id: string;
  name: string;
  description?: string | null;
  type: ReportType;
  datasource: string;
  createdAt: string;
  updatedAt: string;
}

/** Pagination params for running a TABLE report; ignored by KPI/CHART. */
export interface ReportRunOptions {
  /** Zero-based page number. */
  page?: number;
  size?: number;
}

// ---------------------------------------------------------------------------
// 5. Report DATA — discriminated union on `type`
// ---------------------------------------------------------------------------

/** Period-over-period comparison block on KPI data. */
export interface KpiComparison {
  previousValue: number;
  /** The window `previousValue` was computed over; null when the range is unbounded. */
  previousDateRange: { from: string; to: string } | null;
  change: number;
  /** Null when the previous value is 0 (percentage undefined). */
  changePercent: number | null;
  /** Computed on the SIGNED value — a spend KPI growing more negative is `down`. */
  direction: 'up' | 'down' | 'flat';
  /**
   * The business read of the change, driven by `comparison.higherIsBetter`:
   * `good` (color positive/green), `bad` (negative/red), or `neutral` (muted).
   * Use this — not `direction` — to color the delta.
   */
  sentiment: 'good' | 'bad' | 'neutral';
}

/** Resolved metadata echoed back with computed data. */
export interface ReportDataMeta {
  rowCount: number;
  /** The resolved date window; use for labels instead of recomputing. */
  dateRange: { from: string; to: string } | null;
}

export interface KpiData {
  type: 'KPI';
  /** Null when there are no matching rows. Returned as-is (amount is signed). */
  value: number | null;
  measure: string;
  aggregation: Aggregation;
  /** Null when the range is unbounded / `all_time`. */
  comparison: KpiComparison | null;
  meta: ReportDataMeta;
}

export interface ChartData {
  type: 'CHART';
  chartType: string;
  dimension: string;
  /** X-axis labels, ordered. */
  categories: string[];
  /** Each series' `data` is aligned by index to `categories`. */
  series: { name: string; data: (number | null)[] }[];
  measure: { field: string; aggregation: Aggregation };
  meta: ReportDataMeta;
}

export interface TableColumn {
  key: string;
  label: string;
  type: string;
}

/** A table row keyed by `column.key`; raw rows also include a hidden `id`. */
export type TableRow = Record<string, unknown>;

export interface TablePage {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Raw (per-transaction) table data. Aggregated tables return `PivotTableData`. */
export interface TableData {
  type: 'TABLE';
  mode: 'raw';
  columns: TableColumn[];
  rows: TableRow[];
  page: TablePage;
}

// ---------------------------------------------------------------------------
// 5a. Pivot (aggregated) table DATA — row dims × column dims × measures
// ---------------------------------------------------------------------------

/** A pivot row or column dimension descriptor. */
export interface PivotDimensionInfo {
  field: string;
  label: string;
}

/** A pivot measure descriptor; `key` is `${field}_${aggregation}`. */
export interface PivotMeasureInfo {
  key: string;
  field: string;
  aggregation: string;
  label: string;
}

/** A distinct column-value combination; `key` is "" when there are no column dims. */
export interface PivotColumn {
  key: string;
  /** columnDimensionField -> formatted value (date values are pre-formatted). */
  values: Record<string, string>;
}

/** A pivot row group. */
export interface PivotRow {
  key: string;
  /** rowDimensionField -> formatted value (date values are pre-formatted). */
  values: Record<string, string>;
  /** columnKey -> (measureKey -> value); missing combinations are absent. */
  cells: Record<string, Record<string, number>>;
}

/** Aggregated (pivot) table data; `mode: 'aggregated'` discriminates it from `TableData`. */
export interface PivotTableData {
  type: 'TABLE';
  mode: 'aggregated';
  rowDimensions: PivotDimensionInfo[];
  columnDimensions: PivotDimensionInfo[];
  measures: PivotMeasureInfo[];
  /** Distinct column combos (ordered); a single column with key "" when no column dims. */
  columns: PivotColumn[];
  /** The requested page of row groups; `page` paginates row groups. */
  rows: PivotRow[];
  page: TablePage;
}

/** Computed report data; concrete shape discriminated by `type` (and `mode` for tables). */
export type ReportData = KpiData | ChartData | TableData | PivotTableData;
