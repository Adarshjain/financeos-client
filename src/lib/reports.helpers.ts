// Small, pure helpers for the Reports module: narrowing computed data and
// constructing filter clauses with the correct value shape.

import type {
  ChartData,
  FilterClause,
  FilterValue,
  KpiData,
  ReportData,
  TableData,
  TableDefinition,
  TableDefinitionAggregated,
  TableDefinitionRaw,
} from '@/lib/reports.types';

// Narrow ReportData to KPI data.
export function isKpiData(data: ReportData): data is KpiData {
  return data.type === 'KPI';
}

// Narrow ReportData to chart data.
export function isChartData(data: ReportData): data is ChartData {
  return data.type === 'CHART';
}

// Narrow ReportData to table data.
export function isTableData(data: ReportData): data is TableData {
  return data.type === 'TABLE';
}

// Narrow a table definition to its raw variant.
export function isRawTable(
  definition: TableDefinition,
): definition is TableDefinitionRaw {
  return definition.mode === 'raw';
}

// Narrow a table definition to its aggregated variant.
export function isAggregatedTable(
  definition: TableDefinition,
): definition is TableDefinitionAggregated {
  return definition.mode === 'aggregated';
}

// Build a FilterClause. Pass no `value` for valueless operators (e.g.
// this_month, today, all_time) — the `value` key is then omitted from the
// payload rather than sent as undefined/null.
export function buildFilter(
  field: string,
  operator: string,
  value?: FilterValue,
): FilterClause {
  return value === undefined ? { field, operator } : { field, operator, value };
}

// Value for a date `between` operator (ISO yyyy-MM-dd strings).
export function dateBetween(from: string, to: string): { from: string; to: string } {
  return { from, to };
}

// Value for a number `between` operator.
export function numberBetween(from: number, to: number): { from: number; to: number } {
  return { from, to };
}

// Value for a parameterised relative date operator (last_x_days, etc.).
export function relativeAmount(amount: number): { amount: number } {
  return { amount };
}
