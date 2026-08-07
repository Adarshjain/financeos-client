// Small, pure helpers for the Reports module: narrowing computed data and
// constructing filter clauses with the correct value shape.

import type {
  ChartData,
  ChartDefinition,
  FilterClause,
  FilterValue,
  KpiData,
  KpiDefinition,
  PivotTableData,
  ReportData,
  TableData,
  TableDefinition,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Runtime guards for a saved report's `definition`.
 *
 * `ReportDefinition` is discriminated only by the *outer* `report.type` — the
 * union members share no internal tag — so loading a saved report meant casting
 * `definition` to the shape `type` implied. If the two ever disagreed (a bad
 * migration, a stale cache, a backend bug) the cast silently produced an object
 * of `undefined` fields and the builder opened blank rather than failing, which
 * is the worst outcome for the one path where a user's saved work is restored.
 *
 * Each guard checks the fields that member declares as required, which is enough
 * to tell the three shapes apart: KPI's `measure` is a string where CHART's is an
 * object, and TABLE carries an explicit `mode`.
 */
export function isKpiDefinition(def: unknown): def is KpiDefinition {
  return (
    isRecord(def) &&
    typeof def.measure === 'string' &&
    typeof def.aggregation === 'string'
  );
}

export function isChartDefinition(def: unknown): def is ChartDefinition {
  return (
    isRecord(def) &&
    typeof def.chartType === 'string' &&
    isRecord(def.dimension) &&
    isRecord(def.measure)
  );
}

export function isTableDefinition(def: unknown): def is TableDefinition {
  return isRecord(def) && (def.mode === 'raw' || def.mode === 'aggregated');
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
