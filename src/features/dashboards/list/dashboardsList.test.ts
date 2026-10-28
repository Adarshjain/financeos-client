import { describe, expect, it } from 'vitest';

import type { DashboardResponse } from '@/lib/dashboards.types';

import { canRestoreHome, dashboardRow, dashboardRows, filterDashboardRows, widgetCount } from './dashboardsList';

const widget = (kind: 'report' | 'builtin' | 'text') => ({ id: Math.random().toString(), kind, layout: { x: 0, y: 0, w: 50, h: 24 } });
const board = (over: Partial<DashboardResponse> = {}) =>
  ({ id: 'd', name: 'Money', description: null, isDefault: false, updatedAt: '2020-10-13T08:00:00Z', widgets: [], ...over }) as unknown as DashboardResponse;

describe('widgetCount', () => {
  it('does not count section headers', () => {
    expect(widgetCount(board({ widgets: [widget('text'), widget('report'), widget('builtin')] as DashboardResponse['widgets'] }))).toBe(2);
  });
});

describe('dashboardRow', () => {
  it('reads name, description, widget count, default flag, update day and where a row opens', () => {
    const row = dashboardRow(board({ id: 'abc', description: ' Net worth and spend ', isDefault: true, widgets: [widget('report'), widget('report')] as DashboardResponse['widgets'] }));
    expect(row).toMatchObject({ id: 'abc', name: 'Money', description: 'Net worth and spend', widgets: 2, widgetsLabel: '2 widgets', isDefault: true, updated: '13 Oct 2020', href: '/dashboards/abc' });
    expect(row.phoneSub).toBe('Default · 2 widgets · updated 13 Oct 2020');
  });

  it('has no description when it is blank, is singular for one widget and leaves Default out of the phone line for others', () => {
    const row = dashboardRow(board({ description: '  ', widgets: [widget('builtin')] as DashboardResponse['widgets'] }));
    expect(row.description).toBeNull();
    expect(row.widgetsLabel).toBe('1 widget');
    expect(row.phoneSub).toBe('1 widget · updated 13 Oct 2020');
  });

  it('says today for a dashboard updated today', () => {
    expect(dashboardRow(board({ updatedAt: new Date().toISOString() })).updated).toBe('today');
  });
});

describe('dashboardRows', () => {
  it('keeps the server order', () => {
    expect(dashboardRows([board({ id: 'b', name: 'B' }), board({ id: 'a', name: 'A' })]).map((r) => r.id)).toEqual(['b', 'a']);
  });
});

describe('filterDashboardRows', () => {
  const rows = dashboardRows([board({ id: '1', name: 'Home', description: 'Your money at a glance' }), board({ id: '2', name: 'Cards and loans' })]);

  it('returns every row for an empty search', () => {
    expect(filterDashboardRows(rows, '  ')).toHaveLength(2);
  });

  it('matches every word against name and description, ignoring case', () => {
    expect(filterDashboardRows(rows, 'MONEY glance').map((r) => r.id)).toEqual(['1']);
    expect(filterDashboardRows(rows, 'loans cards').map((r) => r.id)).toEqual(['2']);
    expect(filterDashboardRows(rows, 'nothing')).toEqual([]);
  });
});

describe('canRestoreHome', () => {
  it('is offered only while no dashboard is named Home', () => {
    expect(canRestoreHome([board({ name: 'Money' })])).toBe(true);
    expect(canRestoreHome([])).toBe(true);
    expect(canRestoreHome([board({ name: 'Home' })])).toBe(false);
  });
});
