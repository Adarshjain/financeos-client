import { describe, expect, it } from 'vitest';

import type { DashboardResponse } from '@/lib/dashboards.types';

import { builtinsSubtitle, canRestoreHome, dashboardSubtitle, widgetCount } from './dashboardsList';

const widget = (kind: 'report' | 'builtin' | 'text') => ({ id: Math.random().toString(), kind, layout: { x: 0, y: 0, w: 50, h: 24 } });
const board = (over: Partial<DashboardResponse> = {}) =>
  ({ id: 'd', name: 'Money', description: null, isDefault: false, updatedAt: '2026-10-13T08:00:00Z', widgets: [], ...over }) as unknown as DashboardResponse;

describe('widgetCount', () => {
  it('does not count section headers', () => {
    expect(widgetCount(board({ widgets: [widget('text'), widget('report'), widget('builtin')] as DashboardResponse['widgets'] }))).toBe(2);
  });
});

describe('dashboardSubtitle', () => {
  it('reads description, widgets and the update day', () => {
    const d = board({ description: 'Net worth, spend and portfolio', widgets: [widget('report'), widget('report')] as DashboardResponse['widgets'] });
    expect(dashboardSubtitle(d)).toBe('Net worth, spend and portfolio · 2 widgets · Updated 13 Oct');
  });

  it('says so when there is no description, and is singular for one widget', () => {
    expect(dashboardSubtitle(board({ widgets: [widget('builtin')] as DashboardResponse['widgets'] }))).toBe('No description · 1 widget · Updated 13 Oct');
  });
});

describe('canRestoreHome', () => {
  it('is offered only while no dashboard is named Home', () => {
    expect(canRestoreHome([board({ name: 'Money' })])).toBe(true);
    expect(canRestoreHome([])).toBe(true);
    expect(canRestoreHome([board({ name: 'Home' })])).toBe(false);
  });
});

describe('builtinsSubtitle', () => {
  it('counts what is available', () => {
    expect(builtinsSubtitle(18)).toBe('18 available · add to any board');
  });
});
