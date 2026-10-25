import { describe, expect, it } from 'vitest';

import type { BuiltinWidgetResponse } from '@/lib/dashboards.types';
import type { ReportSummaryResponse } from '@/lib/reports.types';

import { builtinMeta, filterBuiltins, filterReports, newBuiltinStep, reportDescription, reportMeta } from './pickerModel';

const def = (over: Partial<BuiltinWidgetResponse>): BuiltinWidgetResponse => ({ key: 'k', label: 'Label', description: 'Does a thing', category: 'c', kind: 'template', minW: 50, params: [], ...over });

describe('builtinMeta', () => {
  it('names the width and what the widget needs', () => {
    const d = def({ minW: 50, params: [{ name: 'accountId', type: 'uuid', ref: 'credit_card', required: true }] });
    expect(builtinMeta(d, false)).toBe('Half width · needs: card');
    expect(builtinMeta(d, true)).toBe('Selected · needs: card');
  });

  it('shows an optional param with its default, and the width from the minimum', () => {
    expect(builtinMeta(def({ minW: 100, params: [{ name: 'n', type: 'int', required: false, defaultValue: 5 }] }), false)).toBe('Full width · n = 5');
    expect(builtinMeta(def({ minW: 25 }), false)).toBe('Quarter width');
    expect(builtinMeta(def({ minW: 25 }), true)).toBe('Selected');
  });

  it('starts a new built-in full when its minimum is the whole grid, a quarter when it allows one, else half', () => {
    expect([100, 25, 2, 50, 70].map((minW) => newBuiltinStep({ minW }))).toEqual(['full', 'quarter', 'quarter', 'half', 'three-quarters']);
  });
});

describe('reports and search', () => {
  const r = (name: string, description: string | null, type: 'KPI' | 'TABLE' = 'KPI') => ({ id: name, name, description, type }) as ReportSummaryResponse;

  it('describes a report by its own description, else its kind', () => {
    expect(reportDescription(r('A', 'Monthly spend'))).toBe('Monthly spend');
    expect(reportDescription(r('B', null, 'TABLE'))).toBe('Table report');
    expect(reportMeta(false)).toBe('Half width');
    expect(reportMeta(true)).toBe('Selected');
  });

  it('filters built-ins by label or description, and reports by name or type (the Legacy search), ignoring case', () => {
    const list = [def({ key: 'a', label: 'Net worth', description: 'Assets minus loans' }), def({ key: 'b', label: 'Bills due', description: 'Each card' })];
    expect(filterBuiltins(list, 'all', 'NET').map((d) => d.key)).toEqual(['a']);
    expect(filterBuiltins(list, 'all', 'card').map((d) => d.key)).toEqual(['b']);
    expect(filterBuiltins(list, 'all', '  ')).toHaveLength(2);
    const reports = [r('Spend by category', null), r('Rewards', 'Points earned')];
    expect(filterReports(reports, 'all', 'rewards').map((x) => x.name)).toEqual(['Rewards']);
    expect(filterReports(reports, 'all', 'zzz')).toEqual([]);
  });
});
