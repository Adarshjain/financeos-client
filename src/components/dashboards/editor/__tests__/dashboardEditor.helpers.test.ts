import { describe, expect, it } from 'vitest';

import type { BuiltinWidgetResponse, WidgetResponse } from '@/lib/dashboards.types';
import type { ReportSummaryResponse } from '@/lib/reports.types';

import {
  applyLayout,
  builtinWidgetResponse,
  canToggleWidth,
  editSignature,
  reportWidgetResponse,
  toggleWidth,
} from '../dashboardEditor.helpers';

const report = (id: string, y = 0, h = 10): WidgetResponse => ({
  id,
  kind: 'report',
  reportId: 'rep',
  title: null,
  layout: { x: 0, y, w: 50, h },
  report: { name: 'R', type: 'KPI', available: true },
});
const builtin = (id: string, minW: number, layout = { x: 0, y: 0, w: 50, h: 10 }): WidgetResponse => ({
  id,
  kind: 'builtin',
  reportId: null,
  builtinKey: 'net_worth',
  params: { b: 1, a: null },
  title: null,
  layout,
  builtin: { key: 'net_worth', label: 'NW', minW, kind: 'template' },
});

describe('editSignature', () => {
  it('changes when built-in params change and ignores param key order / nulls', () => {
    const a = builtin('1', 50);
    const same = { ...a, params: { b: 1 } };
    const diff = { ...a, params: { b: 2 } };
    expect(editSignature('n', 'd', [a])).toBe(editSignature('n', 'd', [same]));
    expect(editSignature('n', 'd', [a])).not.toBe(editSignature('n', 'd', [diff]));
  });
  it('includes kind and builtin key', () => {
    const a = builtin('1', 50);
    expect(editSignature('n', 'd', [a])).not.toBe(editSignature('n', 'd', [{ ...a, builtinKey: 'upcoming' }]));
    const sig = JSON.parse(editSignature('n', 'd', [a, report('2')]));
    expect(sig.widgets[0]).toMatchObject({ kind: 'builtin', builtinKey: 'net_worth', reportId: null });
    expect(sig.widgets[1]).toMatchObject({ kind: 'report', reportId: 'rep', builtinKey: null, params: null });
  });
  it('changes with name, description, title and layout', () => {
    const base = editSignature('n', 'd', [report('1')]);
    expect(editSignature('n2', 'd', [report('1')])).not.toBe(base);
    expect(editSignature('n', 'd2', [report('1')])).not.toBe(base);
    expect(editSignature('n', 'd', [{ ...report('1'), title: 't' }])).not.toBe(base);
    expect(editSignature('n', 'd', [{ ...report('1'), layout: { x: 0, y: 0, w: 51, h: 10 } }])).not.toBe(base);
  });
});

describe('adding widgets', () => {
  it('places a report widget below the lowest existing widget', () => {
    const w = reportWidgetResponse([report('1', 0, 10), report('2', 20, 5)], { id: 'rep9', name: 'Nine', type: 'CHART' } as ReportSummaryResponse);
    expect(w.layout.y).toBe(25);
    expect(w).toMatchObject({ kind: 'report', reportId: 'rep9', report: { name: 'Nine', type: 'CHART', available: true } });
  });
  it('places the first widget at row 0', () => {
    expect(reportWidgetResponse([], { id: 'r', name: 'n', type: 'KPI' } as ReportSummaryResponse).layout.y).toBe(0);
  });
  it('builds a built-in widget with its ref and params, below the rest', () => {
    const def = { key: 'bills_due', label: 'Bills due', description: '', kind: 'component', minW: 100, params: [], href: '/bills', templateType: null } as BuiltinWidgetResponse;
    const w = builtinWidgetResponse([report('1', 0, 10)], def, { accountId: 'a1' });
    expect(w).toMatchObject({
      kind: 'builtin',
      builtinKey: 'bills_due',
      params: { accountId: 'a1' },
      builtin: { key: 'bills_due', label: 'Bills due', minW: 100, kind: 'component', templateType: null, href: '/bills' },
    });
    expect(w.layout).toMatchObject({ y: 10, w: 100, h: 28 });
  });
  it('allows the same built-in twice with distinct ids', () => {
    const def = { key: 'net_worth', label: 'NW', description: '', kind: 'template', minW: 50, params: [] } as BuiltinWidgetResponse;
    const a = builtinWidgetResponse([], def, {});
    const b = builtinWidgetResponse([a], def, {});
    expect(a.id).not.toBe(b.id);
    expect(b.layout.y).toBe(a.layout.h);
    expect(a.builtin?.href).toBeNull();
  });
});

describe('applyLayout', () => {
  it('clamps a built-in to its minimum width and keeps it inside the grid', () => {
    const prev = [builtin('b', 100)];
    const next = applyLayout(prev, [{ i: 'b', x: 30, y: 4, w: 40, h: 12 }]);
    expect(next[0].layout).toEqual({ x: 0, y: 4, w: 100, h: 12 });
  });
  it('shifts x left when the width would overflow', () => {
    const next = applyLayout([report('r')], [{ i: 'r', x: 80, y: 0, w: 50, h: 10 }]);
    expect(next[0].layout).toMatchObject({ x: 50, w: 50 });
  });
  it('caps width at the grid', () => {
    const next = applyLayout([report('r')], [{ i: 'r', x: 0, y: 0, w: 140, h: 10 }]);
    expect(next[0].layout.w).toBe(100);
  });
  it('returns the same array when nothing changed or items are missing', () => {
    const prev = [report('r')];
    expect(applyLayout(prev, [{ i: 'r', x: 0, y: 0, w: 50, h: 10 }])).toBe(prev);
    expect(applyLayout(prev, [{ i: 'other', x: 9, y: 9, w: 9, h: 9 }])).toBe(prev);
  });
  it('uses the grid floor as the minimum for reports', () => {
    const next = applyLayout([report('r')], [{ i: 'r', x: 0, y: 0, w: 1, h: 10 }]);
    expect(next[0].layout.w).toBe(2);
  });
});

describe('canToggleWidth / toggleWidth', () => {
  it('cannot toggle a full-width-minimum widget', () => {
    expect(canToggleWidth(builtin('b', 100))).toBe(false);
    expect(canToggleWidth(builtin('b', 50))).toBe(true);
    expect(canToggleWidth(report('r'))).toBe(true);
  });
  it('expands a half widget to full at x 0', () => {
    const out = toggleWidth([builtin('b', 50, { x: 50, y: 0, w: 50, h: 10 })], 'b');
    expect(out[0].layout).toMatchObject({ x: 0, w: 100 });
  });
  it('collapses full to half, or to the minimum when that is wider', () => {
    expect(toggleWidth([report('r')].map((w) => ({ ...w, layout: { ...w.layout, w: 100 } })), 'r')[0].layout.w).toBe(50);
    expect(toggleWidth([builtin('b', 70, { x: 0, y: 0, w: 100, h: 10 })], 'b')[0].layout.w).toBe(70);
  });
  it('leaves non-toggleable widgets and other ids untouched', () => {
    const fixed = builtin('b', 100, { x: 0, y: 0, w: 100, h: 10 });
    const other = report('r');
    const out = toggleWidth([fixed, other], 'b');
    expect(out[0]).toBe(fixed);
    expect(out[1]).toBe(other);
  });
});
