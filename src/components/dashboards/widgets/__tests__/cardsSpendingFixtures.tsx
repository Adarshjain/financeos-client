// Shared fixtures for the cards & spending widget tests: account and widget
// builders, raw/pivot/chart report data, and dialog stand-ins that expose the
// props they were opened with.

import type { WidgetResponse } from '@/lib/dashboards.types';
import type { ChartData, PivotTableData, TableData, TableRow } from '@/lib/reports.types';

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

export function widget(key: string, params: Record<string, unknown> = {}, over: Partial<WidgetResponse> = {}): WidgetResponse {
  return {
    id: `w-${key}`,
    kind: 'builtin',
    reportId: null,
    builtinKey: key,
    params,
    title: null,
    layout: { x: 0, y: 0, w: 50, h: 24 },
    builtin: { category: 'cards_rewards', key, label: 'Widget', minW: 50, kind: 'template' } as WidgetResponse['builtin'],
    ...over,
  };
}

export function rawTable(columns: string[], rows: TableRow[], page: Partial<TableData['page']> = {}): TableData {
  return {
    type: 'TABLE',
    mode: 'raw',
    columns: columns.map((key) => ({ key, label: key, type: 'string' })),
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

export function dayChart(points: Array<[string, number]>, range: { from: string; to: string } | null): ChartData {
  return {
    type: 'CHART',
    chartType: 'bar',
    dimension: 'date',
    categories: points.map(([d]) => d),
    series: [{ name: 'spend', data: points.map(([, v]) => v) }],
    measure: { field: 'spend', aggregation: 'sum' },
    meta: { rowCount: points.length, dateRange: range as never },
  };
}

/** Reads the props a mocked dialog rendered with. */
export function dialogProps(el: HTMLElement): Record<string, unknown> {
  return JSON.parse(el.getAttribute('data-props') ?? '{}');
}

export const noop = () => {};
