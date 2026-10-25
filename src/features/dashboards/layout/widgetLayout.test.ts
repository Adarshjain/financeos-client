import { describe, expect, it } from 'vitest';

import type { WidgetResponse } from '@/lib/dashboards.types';

import { applyGridLayout, clampStep, flowLayout, minWidthStep, normalizeWidgets, orderWidgets, toGridLayout, widthStepOf } from './widgetLayout';

function w(id: string, layout: Partial<WidgetResponse['layout']> = {}, over: Partial<WidgetResponse> = {}): WidgetResponse {
  return {
    id,
    kind: 'report',
    reportId: `r-${id}`,
    title: null,
    layout: { x: 0, y: 0, w: 50, h: 24, ...layout },
    report: { name: id, type: 'KPI', available: true },
    ...over,
  };
}

const builtin = (id: string, minW: number, layout: Partial<WidgetResponse['layout']> = {}): WidgetResponse =>
  w(id, layout, { kind: 'builtin', reportId: null, builtinKey: id, builtin: { key: id, label: id, minW, kind: 'template' } as WidgetResponse['builtin'] });
const header = (id: string, layout: Partial<WidgetResponse['layout']> = {}): WidgetResponse =>
  w(id, { w: 100, h: 5, ...layout }, { kind: 'text', reportId: null, title: id });

describe('reading the server layout', () => {
  it('orders widgets by y then x, keeping the stored order for ties', () => {
    const list = [w('c', { x: 50, y: 24 }), w('a', { x: 0, y: 0 }), w('b', { x: 50, y: 0 }), w('d', { x: 50, y: 24 })];
    expect(orderWidgets(list).map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('maps the 100-column width to the nearest step', () => {
    const step = (cols: number) => widthStepOf(w('x', { w: cols }));
    expect([25, 33, 50, 67, 75, 100].map(step)).toEqual(['quarter', 'third', 'half', 'two-thirds', 'three-quarters', 'full']);
    expect([20, 40, 60, 90].map(step)).toEqual(['quarter', 'third', 'two-thirds', 'full']);
  });

  it('never reads a widget narrower than its own minimum, and a header as full width', () => {
    expect(widthStepOf(builtin('bills_due', 100, { w: 50 }))).toBe('full');
    expect(widthStepOf(builtin('milestones', 40, { w: 25 }))).toBe('half');
    expect(widthStepOf(header('h', { w: 30 }))).toBe('full');
  });

  it('gives the grid the order and widths of the widgets as they are', () => {
    expect(toGridLayout([w('a', { w: 25 }), w('b', { w: 75 })])).toEqual([
      { id: 'a', width: 'quarter' },
      { id: 'b', width: 'three-quarters' },
    ]);
  });

  it('starts the editor from reading order with widths snapped and positions flowed', () => {
    const out = normalizeWidgets([w('b', { x: 40, y: 0, w: 60 }), w('a', { x: 0, y: 0, w: 40 })]);
    expect(out.map((x) => [x.id, x.layout.x, x.layout.y, x.layout.w])).toEqual([
      ['a', 0, 0, 33],
      ['b', 33, 0, 67],
    ]);
  });
});

describe('minimum widths', () => {
  it('a full-width built-in only takes full; others the first step wide enough', () => {
    expect(minWidthStep(builtin('a', 100))).toBe('full');
    expect(minWidthStep(builtin('b', 50))).toBe('half');
    expect(minWidthStep(builtin('c', 40))).toBe('half');
    expect(minWidthStep(builtin('d', 2))).toBe('quarter');
    expect(minWidthStep(w('r'))).toBe('quarter');
  });

  it('widens a step below the minimum and keeps one above it', () => {
    expect(clampStep(builtin('a', 50), 'quarter')).toBe('half');
    expect(clampStep(builtin('a', 50), 'three-quarters')).toBe('three-quarters');
    expect(clampStep(header('h'), 'half')).toBe('full');
  });
});

describe('applying a grid layout', () => {
  const widgets = [w('a'), w('b'), w('c')];

  it('reorders and resizes', () => {
    const next = applyGridLayout(widgets, [
      { id: 'c', width: 'half' },
      { id: 'a', width: 'quarter' },
      { id: 'b', width: 'half' },
    ]);
    expect(next.map((x) => x.id)).toEqual(['c', 'a', 'b']);
    expect(next.find((x) => x.id === 'a')?.layout.w).toBe(25);
  });

  it('returns the same array when nothing changed', () => {
    expect(applyGridLayout(widgets, toGridLayout(widgets))).toBe(widgets);
  });

  it('refuses a resize below the widget minimum (nothing changes)', () => {
    const list = [builtin('bills_due', 100, { w: 100 })];
    expect(applyGridLayout(list, [{ id: 'bills_due', width: 'half' }])).toBe(list);
  });

  it('keeps widgets the layout does not list, at the end', () => {
    expect(applyGridLayout(widgets, [{ id: 'b', width: 'half' }]).map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('writing the flow back', () => {
  it('fills rows left to right and starts a new row when a widget does not fit', () => {
    const out = flowLayout([w('a', { w: 50 }), w('b', { w: 50 }), w('c', { w: 75 }), w('d', { w: 25 })]);
    expect(out.map((x) => [x.layout.x, x.layout.y, x.layout.w])).toEqual([
      [0, 0, 50],
      [50, 0, 50],
      [0, 24, 75],
      [75, 24, 25],
    ]);
  });

  it('writes each step as its column width and keeps h', () => {
    const steps = [
      { w: 25, cols: 25 },
      { w: 33, cols: 33 },
      { w: 67, cols: 67 },
    ];
    for (const s of steps) expect(flowLayout([w('a', { w: s.w, h: 31 })])[0].layout).toMatchObject({ w: s.cols, h: 31 });
  });

  it('puts thirds side by side and never exceeds 100 columns', () => {
    const out = flowLayout([w('a', { w: 33 }), w('b', { w: 33 }), w('c', { w: 33 }), w('d', { w: 67 }), w('e', { w: 33 })]);
    expect(out.map((x) => [x.layout.x, x.layout.y])).toEqual([
      [0, 0],
      [33, 0],
      [67, 0],
      [0, 24],
      [67, 24],
    ]);
    for (const x of out) expect(x.layout.x + x.layout.w).toBeLessThanOrEqual(100);
  });

  it('advances y by the tallest widget of a row, and a header is a row of its own', () => {
    const out = flowLayout([w('a', { w: 50, h: 30 }), w('b', { w: 50, h: 24 }), header('h'), w('c', { w: 50 })]);
    expect(out.map((x) => x.layout.y)).toEqual([0, 0, 30, 35]);
    expect(out[2].layout).toMatchObject({ x: 0, w: 100, h: 5 });
  });

  it('is read back as the same order and widths (what Legacy and the grid both lay out)', () => {
    const written = flowLayout([w('a', { w: 67 }), w('b', { w: 33 }), w('c', { w: 100 }), w('d', { w: 25 })]);
    const back = normalizeWidgets([...written].reverse());
    expect(back.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(back.map((x) => x.layout.w)).toEqual([67, 33, 100, 25]);
  });
});
