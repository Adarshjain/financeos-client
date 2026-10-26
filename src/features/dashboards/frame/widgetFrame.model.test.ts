import { describe, expect, it } from 'vitest';

import type { WidgetResponse } from '@/lib/dashboards.types';

import { widgetHref, widgetMenuItems, widgetSubtitle } from './widgetFrame.model';

const report = (over: Partial<WidgetResponse> = {}): WidgetResponse => ({
  id: 'w1',
  kind: 'report',
  reportId: 'r1',
  title: null,
  layout: { x: 0, y: 0, w: 50, h: 24 },
  report: { name: 'Spend', type: 'KPI', available: true },
  ...over,
});

const builtin = (kind: 'template' | 'component', over: Partial<NonNullable<WidgetResponse['builtin']>> = {}): WidgetResponse => ({
  id: 'w2',
  kind: 'builtin',
  reportId: null,
  builtinKey: 'upcoming',
  params: {},
  title: null,
  layout: { x: 0, y: 0, w: 100, h: 24 },
  builtin: { key: 'upcoming', label: 'Upcoming', minW: 100, kind, href: '/upcoming', category: 'overview', ...over } as NonNullable<WidgetResponse['builtin']>,
});

describe('widgetMenuItems', () => {
  it('a report widget: Edit report, View full page and View underlying data (every report widget, any report type)', () => {
    for (const type of ['KPI', 'CHART', 'TABLE'] as const) {
      expect(widgetMenuItems(report({ report: { name: 'x', type, available: true } }), { canEditSettings: false })).toEqual([
        'edit-report',
        'full-page',
        'underlying',
      ]);
    }
  });

  it('a template built-in: Widget settings, Duplicate as my report, View full page', () => {
    expect(widgetMenuItems(builtin('template'), { canEditSettings: true })).toEqual(['settings', 'duplicate', 'full-page']);
  });

  it('a component built-in has no Duplicate', () => {
    expect(widgetMenuItems(builtin('component'), { canEditSettings: true })).toEqual(['settings', 'full-page']);
  });

  it('leaves Widget settings out when the dashboard cannot save them, and View full page out without a page of its own', () => {
    expect(widgetMenuItems(builtin('template', { href: null }), { canEditSettings: false })).toEqual(['duplicate']);
  });

  it('has no menu for an unavailable widget', () => {
    expect(widgetMenuItems(report({ report: { available: false } }), { canEditSettings: true })).toEqual([]);
    expect(widgetMenuItems({ ...builtin('template'), builtin: undefined }, { canEditSettings: true })).toEqual([]);
  });
});

describe('widgetHref and widgetSubtitle', () => {
  it('a built-in links to its page; a report widget has no Open link', () => {
    expect(widgetHref(builtin('template'))).toBe('/upcoming');
    expect(widgetHref(report())).toBeNull();
    expect(widgetHref({ ...builtin('template'), builtin: undefined })).toBeNull();
  });

  it('a saved report widget has no subtitle; a built-in uses the server subtitle', () => {
    expect(widgetSubtitle(report())).toBeNull();
    expect(widgetSubtitle(builtin('component', { subtitle: 'Next 14 days', key: 'unknown_key' }))).toBe('Next 14 days');
  });
});
