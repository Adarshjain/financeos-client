// Small, pure helpers for the Reports module: narrowing computed data and
// constructing filter clauses with the correct value shape.

import type {
  ChartData,
  FilterClause,
  FilterValue,
  KpiData,
  PivotTableData,
  ReportData,
  TableData,
  TableDefinition,
  TableDefinitionAggregated,
  TableDefinitionRaw,
} from '@/lib/reports.types';
import { formatMoney } from '@/lib/utils';

/**
 * Whether a field's numeric values are monetary.
 *
 * A naming heuristic, because the datasource catalog exposes no "currency"
 * flag — replacing this with a real catalog flag is the proper fix. It exists
 * so the rule lives in ONE place: the three report views each had their own,
 * and they had already diverged (the raw table used `key.includes('amount')`
 * while KPI and pivot used exact equality, so a field like `refundAmount`
 * would have rendered as currency in one view and as a plain number in the
 * other two).
 */
export function isMoneyField(field: string): boolean {
  return field.toLowerCase().endsWith('amount');
}

/**
 * Renders a measure value consistently across the KPI, raw-table and pivot
 * views: counts as plain integers, money as currency, everything else to two
 * decimal places.
 */
export function formatMeasureValue(
  value: number | null | undefined,
  options: { field?: string; aggregation?: string },
): string {
  if (value === null || value === undefined) return '—';
  if (options.aggregation === 'count') {
    return new Intl.NumberFormat('en-IN').format(value);
  }
  if (options.field && isMoneyField(options.field)) return formatMoney(value);
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);
}

// Narrow ReportData to KPI data.
export function isKpiData(data: ReportData): data is KpiData {
  return data.type === 'KPI';
}

// Narrow ReportData to chart data.
export function isChartData(data: ReportData): data is ChartData {
  return data.type === 'CHART';
}

// Narrow ReportData to RAW table data. Both raw tables and pivots carry
// `type: 'TABLE'`, so the `mode` discriminator is what tells them apart.
export function isRawTableData(data: ReportData): data is TableData {
  return data.type === 'TABLE' && data.mode === 'raw';
}

// Narrow ReportData to PIVOT (aggregated) table data.
export function isPivotTableData(data: ReportData): data is PivotTableData {
  return data.type === 'TABLE' && data.mode === 'aggregated';
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
