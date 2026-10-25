// Builders shared by the built-in tests: accounts, widgets and report data.

import type { WidgetResponse } from '@/lib/dashboards.types';
import type { KpiData, PivotTableData, TableData, TableRow } from '@/lib/reports.types';

import type { BuiltinBodyProps } from './types';

export const TODAY = '2026-10-10';
/** Noon IST on TODAY, so the app-zone "today" is TODAY. */
export const NOW = new Date('2026-10-10T06:30:00Z');

export function account(over: Record<string, unknown>) {
  return {
    id: 'a1',
    name: 'Account',
    type: 'bank_account',
    balance: 0,
    excludeFromNetAsset: false,
    financialPosition: 'asset',
    closedOn: null,
    balanceAnchored: false,
    anchorDate: null,
    reconciliationGap: null,
    warnings: [],
    ...over,
  };
}

export function card(over: Record<string, unknown>) {
  return account({ type: 'credit_card', financialPosition: 'liability', last4: '1111', creditLimit: 100000, effectiveCreditLimit: 100000, ...over });
}

export function widget(key: string, params: Record<string, unknown> = {}): WidgetResponse {
  return {
    id: `w-${key}`,
    kind: 'builtin',
    reportId: null,
    builtinKey: key,
    params,
    title: null,
    layout: { x: 0, y: 0, w: 50, h: 24 },
    builtin: { category: 'cards_rewards', key, label: 'Widget', minW: 50, kind: 'template' } as WidgetResponse['builtin'],
  };
}

/** The props the frame gives a component built-in's body. */
export function bodyProps(key: string, params: Record<string, unknown> = {}): BuiltinBodyProps {
  return { widget: widget(key, params), params };
}

export function rawTable(columns: Array<string | { key: string; type: string }>, rows: TableRow[], page: Partial<TableData['page']> = {}): TableData {
  return {
    type: 'TABLE',
    mode: 'raw',
    columns: columns.map((c) => (typeof c === 'string' ? { key: c, label: c, type: 'string' } : { ...c, label: c.key })),
    rows,
    page: { number: 0, size: 50, totalElements: rows.length, totalPages: 1, ...page },
  };
}

export function pivot(rows: Array<{ card: string; cardId?: string; cells: Record<string, number> }>): PivotTableData {
  return {
    type: 'TABLE',
    mode: 'aggregated',
    rowDimensions: [{ field: 'card', label: 'Card' }],
    columnDimensions: [],
    measures: ['cashInr', 'points', 'pointsValueInr', 'valueInr'].map((f) => ({
      key: `${f}_sum`, field: f, aggregation: 'sum', label: f,
    })),
    columns: [{ key: '', values: {} }],
    rows: rows.map((r) => ({
      key: r.card,
      values: { card: r.card },
      cells: { '': r.cells },
      ...(r.cardId ? { ids: { cardId: r.cardId } } : {}),
    })),
    page: { number: 0, size: 50, totalElements: rows.length, totalPages: 1 },
  };
}

export function kpi(value: number | null, comparison: KpiData['comparison'] = null): KpiData {
  return {
    type: 'KPI',
    value,
    measure: 'signedValue',
    aggregation: 'sum',
    format: 'currency',
    comparison,
    meta: { rowCount: 1, dateRange: null },
  };
}
