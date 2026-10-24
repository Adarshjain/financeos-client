import { describe, expect, it } from 'vitest';

import type { ReportSummaryResponse } from '@/lib/reports.types';

import {
  areaOf,
  datasourceOptions,
  filterRows,
  parseReportsType,
  reportRow,
  reportRows,
  reportsUrl,
  templateHref,
} from './reportsList';

const report = (over: Partial<ReportSummaryResponse> = {}): ReportSummaryResponse => ({
  id: 'r1',
  name: 'Spend this month',
  description: null,
  type: 'KPI',
  datasource: 'transactions',
  createdAt: '2026-10-01T05:00:00Z',
  updatedAt: '2026-10-20T05:00:00Z',
  dashboards: [],
  ...over,
});

const labels = { transactions: 'Transactions', net_worth: 'Net worth', positions: 'Positions', reward_earnings: 'Reward earnings' };

describe('type filter in the URL', () => {
  it('reads a known type and treats anything else as All', () => {
    expect(parseReportsType({ type: 'CHART' })).toBe('CHART');
    expect(parseReportsType({ type: 'chart' })).toBeUndefined();
    expect(parseReportsType({})).toBeUndefined();
  });

  it('keeps All out of the query string', () => {
    expect(reportsUrl()).not.toContain('?');
    expect(reportsUrl('TABLE')).toMatch(/\?type=TABLE$/);
  });
});

describe('areas', () => {
  it('groups datasources by area and puts an unknown one under Other', () => {
    expect(areaOf('transactions').label).toBe('Spending');
    expect(areaOf('net_worth').label).toBe('Wealth');
    expect(areaOf('reward_earnings').label).toBe('Cards & loans');
    expect(areaOf('brand_new_source').label).toBe('Other');
  });
});

describe('reportRow', () => {
  it('shows the datasource label, the dashboards by name and the updated day', () => {
    const row = reportRow(
      report({ dashboards: [{ id: 'd1', name: 'Home' }, { id: 'd2', name: 'Money overview' }] }),
      labels,
    );
    expect(row.datasourceLabel).toBe('Transactions');
    expect(row.onDashboards).toBe('Home · Money overview');
    expect(row.updated).toBe('20 Oct');
    expect(row.typeLabel).toBe('KPI');
  });

  it('labels the type by chart subtype when the server gives one', () => {
    expect(reportRow(report({ type: 'CHART', chartType: 'stackedBar' }), labels).typeLabel).toBe('Stacked bar');
    expect(reportRow(report({ type: 'CHART', chartType: 'breakdown' }), labels).typeLabel).toBe('Breakdown');
    expect(reportRow(report({ type: 'CHART', chartType: 'donut' }), labels).typeLabel).toBe('Donut');
    expect(reportRow(report({ type: 'CHART', chartType: null }), labels).typeLabel).toBe('Chart');
    expect(reportRow(report({ type: 'TABLE' }), labels).typeLabel).toBe('Table');
  });

  it('says today and yesterday for the updated day', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
    expect(reportRow(report({ updatedAt: now.toISOString() }), labels).updated).toBe('today');
    expect(reportRow(report({ updatedAt: yesterday.toISOString() }), labels).updated).toBe('yesterday');
  });

  it('falls back to the datasource name and an em dash when nothing is known', () => {
    const row = reportRow(report({ datasource: 'mystery' }), {});
    expect(row.datasourceLabel).toBe('mystery');
    expect(row.onDashboards).toBe('—');
  });

  it('writes the phone line as datasource then where it is used', () => {
    expect(reportRow(report(), labels).phoneSub).toBe('Transactions');
    expect(reportRow(report({ dashboards: [{ id: 'd1', name: 'Home' }] }), labels).phoneSub).toBe('Transactions · on Home');
    expect(
      reportRow(report({ dashboards: [{ id: 'd1', name: 'Home' }, { id: 'd2', name: 'Money' }] }), labels).phoneSub,
    ).toBe('Transactions · on 2 dashboards');
  });

  it('keeps a description only when it has text', () => {
    expect(reportRow(report({ description: '  ' }), labels).description).toBeNull();
    expect(reportRow(report({ description: 'Last 90 days' }), labels).description).toBe('Last 90 days');
  });
});

describe('reportRows', () => {
  it('orders by area (Spending, Wealth, Cards & loans, Other) and then by name', () => {
    const rows = reportRows(
      [
        report({ id: 'a', name: 'Rewards earned', datasource: 'reward_earnings' }),
        report({ id: 'b', name: 'Net worth', datasource: 'net_worth' }),
        report({ id: 'c', name: 'Zed', datasource: 'transactions' }),
        report({ id: 'd', name: 'Alpha', datasource: 'transactions' }),
        report({ id: 'e', name: 'Odd', datasource: 'mystery' }),
      ],
      labels,
    );
    expect(rows.map((r) => r.id)).toEqual(['d', 'c', 'b', 'a', 'e']);
  });
});

describe('filters', () => {
  const rows = reportRows(
    [
      report({ id: 'a', name: 'Spend by category', description: 'Dining and travel' }),
      report({ id: 'b', name: 'Net worth', datasource: 'net_worth' }),
      report({ id: 'c', name: 'Portfolio by holding', datasource: 'positions' }),
    ],
    labels,
  );

  it('lists the datasources in use, by label', () => {
    expect(datasourceOptions(rows)).toEqual([
      { value: 'net_worth', label: 'Net worth' },
      { value: 'positions', label: 'Positions' },
      { value: 'transactions', label: 'Transactions' },
    ]);
  });

  it('searches every word over name, description and datasource', () => {
    expect(filterRows(rows, 'dining', []).map((r) => r.id)).toEqual(['a']);
    expect(filterRows(rows, 'spend  CATEGORY', []).map((r) => r.id)).toEqual(['a']);
    expect(filterRows(rows, 'positions', []).map((r) => r.id)).toEqual(['c']);
    expect(filterRows(rows, 'nothing here', [])).toEqual([]);
  });

  it('narrows to the chosen datasources, together with the search', () => {
    expect(filterRows(rows, '', ['net_worth', 'positions']).map((r) => r.id)).toEqual(['b', 'c']);
    expect(filterRows(rows, 'worth', ['positions'])).toEqual([]);
  });
});

describe('templates', () => {
  it('sends Use to New report, naming the template', () => {
    expect(templateHref({ id: 'dividend-income-by-fy', label: 'x' })).toMatch(/\/reports\/new\?template=dividend-income-by-fy$/);
  });
});
