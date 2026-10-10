import { describe, expect, it } from 'vitest';

import {
  builtinWidgetQueryParams,
  DASHBOARD_GRID_COLUMNS,
  HALF_WIDTH,
  isWidgetAvailable,
  newBuiltinWidget,
  stableParams,
  toDashboardWidget,
  validateWidgets,
  widgetMinW,
  widgetParams,
  widgetQueryParams,
  widgetTitle,
} from '../dashboards.helpers';
import type { BuiltinWidgetResponse, DashboardWidget, WidgetResponse } from '../dashboards.types';

const def = (over: Partial<BuiltinWidgetResponse> = {}): BuiltinWidgetResponse => ({
  category: 'overview',
  key: 'net_worth',
  label: 'Net worth',
  description: 'd',
  kind: 'template',
  minW: 50,
  params: [],
  ...over,
});

const builtinWidget = (over: Partial<WidgetResponse> = {}): WidgetResponse => ({
  id: 'w1',
  kind: 'builtin',
  reportId: null,
  builtinKey: 'upcoming',
  params: { days: 14 },
  title: null,
  layout: { x: 0, y: 0, w: 100, h: 24 },
  builtin: { category: 'overview', key: 'upcoming', label: 'Upcoming', minW: 100, kind: 'template', href: '/upcoming' },
  ...over,
});

describe('newBuiltinWidget', () => {
  it('is full width when the built-in minimum is the whole grid', () => {
    const w = newBuiltinWidget(def({ key: 'upcoming', minW: 100 }), {});
    expect(w.layout.w).toBe(DASHBOARD_GRID_COLUMNS);
    expect(w.kind).toBe('builtin');
    expect(w.builtinKey).toBe('upcoming');
    expect(w.reportId).toBeUndefined();
  });

  it('is half width when the minimum is smaller', () => {
    expect(newBuiltinWidget(def({ minW: 50 }), {}).layout.w).toBe(HALF_WIDTH);
  });

  it('gives bills_due a taller default height than the rest', () => {
    expect(newBuiltinWidget(def({ key: 'bills_due', minW: 100 }), {}).layout.h).toBe(28);
    expect(newBuiltinWidget(def({ key: 'net_worth' }), {}).layout.h).toBe(24);
  });

  it('lets a layout override win and normalizes params', () => {
    const w = newBuiltinWidget(def(), { b: 1, a: null }, { y: 40, w: 60 });
    expect(w.layout).toEqual({ x: 0, y: 40, w: 60, h: 24 });
    expect(w.params).toEqual({ b: 1 });
  });

  it('mints a distinct id per call (adding twice is allowed)', () => {
    expect(newBuiltinWidget(def(), {}).id).not.toBe(newBuiltinWidget(def(), {}).id);
  });
});

describe('widgetMinW', () => {
  it('uses the built-in minimum', () => {
    expect(widgetMinW({ builtin: { minW: 50 } })).toBe(50);
  });
  it('falls back to the grid floor for reports and null built-ins', () => {
    expect(widgetMinW({})).toBe(2);
    expect(widgetMinW({ builtin: undefined })).toBe(2);
  });
});

describe('stableParams / widgetParams', () => {
  it('sorts keys and drops null and undefined but keeps falsy values', () => {
    const out = stableParams({ z: 1, a: null, m: undefined, b: 0, c: '', d: false });
    expect(Object.keys(out)).toEqual(['b', 'c', 'd', 'z']);
    expect(out).toEqual({ b: 0, c: '', d: false, z: 1 });
  });
  it('returns {} for non-objects', () => {
    expect(stableParams(null)).toEqual({});
    expect(stableParams(undefined)).toEqual({});
    expect(stableParams([1, 2])).toEqual({});
    expect(stableParams('x')).toEqual({});
  });
  it('widgetParams normalizes the widget params', () => {
    expect(widgetParams({ params: { b: 1, a: 2, c: null } })).toEqual({ a: 2, b: 1 });
    expect(JSON.stringify(widgetParams({ params: { b: 1, a: 2 } }))).toBe('{"a":2,"b":1}');
  });
});

describe('query params keys', () => {
  it('builtinWidgetQueryParams adds page/size only for tables and sorts params', () => {
    expect(builtinWidgetQueryParams('upcoming', { b: 2, a: 1 }, true, 1, 20)).toEqual({
      builtinKey: 'upcoming',
      params: { a: 1, b: 2 },
      isTable: true,
      page: 1,
      size: 20,
    });
    const kpi = builtinWidgetQueryParams('net_worth', {}, false, 3, 50);
    expect(kpi).toEqual({ builtinKey: 'net_worth', params: {}, isTable: false });
    expect('page' in kpi).toBe(false);
  });
  it('param key order does not change the serialized key', () => {
    expect(JSON.stringify(builtinWidgetQueryParams('k', { b: 1, a: 2 }, false, 0, 10))).toBe(
      JSON.stringify(builtinWidgetQueryParams('k', { a: 2, b: 1 }, false, 0, 10)),
    );
  });
  it('widgetQueryParams for reports', () => {
    expect(widgetQueryParams('r', true, 2, 10)).toEqual({ reportId: 'r', isTable: true, page: 2, size: 10 });
    expect(widgetQueryParams('r', false, 2, 10)).toEqual({ reportId: 'r', isTable: false });
  });
});

describe('toDashboardWidget', () => {
  it('maps a built-in: key and params kept, reportId null', () => {
    const out = toDashboardWidget(builtinWidget({ title: '  Mine  ', params: { days: 7, x: null } }));
    expect(out).toEqual({
      id: 'w1',
      kind: 'builtin',
      reportId: null,
      builtinKey: 'upcoming',
      params: { days: 7 },
      title: 'Mine',
      layout: { x: 0, y: 0, w: 100, h: 24 },
    });
  });
  it('maps a report: builtinKey and params null, blank title null', () => {
    const out = toDashboardWidget({
      id: 'r1',
      kind: 'report',
      reportId: 'rep',
      title: '   ',
      layout: { x: 1, y: 2, w: 3, h: 4 },
    } as WidgetResponse);
    expect(out).toMatchObject({ kind: 'report', reportId: 'rep', builtinKey: null, params: null, title: null });
  });
});

describe('isWidgetAvailable', () => {
  it('built-in needs a resolved builtin ref', () => {
    expect(isWidgetAvailable(builtinWidget())).toBe(true);
    expect(isWidgetAvailable(builtinWidget({ builtin: undefined }))).toBe(false);
  });
  it('report needs id and available flag', () => {
    const base = { id: 'r', kind: 'report', title: null, layout: { x: 0, y: 0, w: 1, h: 1 } } as WidgetResponse;
    expect(isWidgetAvailable({ ...base, reportId: 'x', report: { name: 'n', type: 'KPI', available: true } })).toBe(true);
    expect(isWidgetAvailable({ ...base, reportId: 'x', report: { name: 'n', type: 'KPI', available: false } })).toBe(false);
    expect(isWidgetAvailable({ ...base, reportId: null, report: { name: 'n', type: 'KPI', available: true } })).toBe(false);
    expect(isWidgetAvailable({ ...base, reportId: 'x' })).toBe(false);
  });
});

describe('widgetTitle', () => {
  it('prefers a non-blank override, then built-in label, then report name, then Untitled', () => {
    expect(widgetTitle(builtinWidget({ title: 'Mine' }))).toBe('Mine');
    expect(widgetTitle(builtinWidget({ title: '  ' }))).toBe('Upcoming');
    const rep = { id: 'r', kind: 'report', title: null, layout: { x: 0, y: 0, w: 1, h: 1 }, report: { name: 'Rep', type: 'KPI', available: true } } as WidgetResponse;
    expect(widgetTitle(rep)).toBe('Rep');
    expect(widgetTitle({ ...rep, report: undefined })).toBe('Untitled');
  });
});

describe('validateWidgets built-in rules', () => {
  const w = (over: Partial<DashboardWidget & { builtin: { minW: number; label?: string } | null }> = {}) =>
    ({
      id: 'a',
      kind: 'builtin',
      builtinKey: 'upcoming',
      title: null,
      layout: { x: 0, y: 0, w: 100, h: 24 },
      builtin: { minW: 100, label: 'Upcoming' },
      ...over,
    }) as never;

  it('accepts a built-in at or above its minimum', () => {
    expect(validateWidgets([w()])).toEqual([]);
    expect(validateWidgets([w({ builtin: { minW: 50, label: 'X' }, layout: { x: 0, y: 0, w: 50, h: 1 } })])).toEqual([]);
  });
  it('rejects a built-in narrower than its minimum, naming it', () => {
    const errors = validateWidgets([w({ layout: { x: 0, y: 0, w: 60, h: 24 } })]);
    expect(errors).toEqual(['Upcoming must be at least 100 of 100 columns wide.']);
  });
  it('falls back to a numbered label when the built-in has none', () => {
    const errors = validateWidgets([w({ builtin: { minW: 100 }, layout: { x: 0, y: 0, w: 60, h: 24 } })]);
    expect(errors[0]).toBe('Widget 1 must be at least 100 of 100 columns wide.');
  });
  it('flags a built-in the server no longer knows', () => {
    const errors = validateWidgets([w({ builtin: undefined })]);
    expect(errors).toContain('Widget 1 is no longer available — remove it to save.');
  });
  it('does not apply a minimum to report widgets and ignores a missing builtin key on them', () => {
    expect(
      validateWidgets([{ id: 'r', kind: 'report', reportId: 'x', title: null, layout: { x: 0, y: 0, w: 3, h: 2 } } as never]),
    ).toEqual([]);
  });
  it('does not call a built-in without a resolved ref field unavailable', () => {
    expect(validateWidgets([{ id: 'b', kind: 'builtin', builtinKey: 'k', layout: { x: 0, y: 0, w: 2, h: 2 } } as never])).toEqual([]);
  });
});
