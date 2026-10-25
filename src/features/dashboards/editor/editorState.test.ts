import { describe, expect, it } from 'vitest';

import type { BuiltinWidgetResponse, DashboardResponse, WidgetResponse } from '@/lib/dashboards.types';

import { editorReducer, editorSignature, initialEditorState, saveBody, widgetIssues } from './editorState';

const report = (id: string, layout: Partial<WidgetResponse['layout']> = {}): WidgetResponse => ({
  id,
  kind: 'report',
  reportId: `r-${id}`,
  title: null,
  layout: { x: 0, y: 0, w: 50, h: 24, ...layout },
  report: { name: id, type: 'KPI', available: true },
});

const cardDef: BuiltinWidgetResponse = {
  key: 'card_utilisation',
  label: 'Card utilisation',
  description: '',
  category: 'cards',
  kind: 'component',
  minW: 50,
  params: [{ name: 'accountId', type: 'uuid', ref: 'credit_card', required: true }],
};
const netWorthDef: BuiltinWidgetResponse = { key: 'net_worth', label: 'Net worth', description: '', category: 'overview', kind: 'template', minW: 25, params: [] };

const saved = (widgets: WidgetResponse[]): DashboardResponse =>
  ({ id: 'd1', name: 'Money', description: 'All of it', isDefault: false, widgets, updatedAt: 't' }) as DashboardResponse;

const start = (widgets: WidgetResponse[] = []) => initialEditorState(saved(widgets));

describe('initialEditorState', () => {
  it('opens a dashboard in reading order, widths snapped', () => {
    const state = initialEditorState(saved([report('b', { x: 50, y: 0 }), report('a', { x: 0, y: 0 })]));
    expect(state.widgets.map((w) => w.id)).toEqual(['a', 'b']);
    expect(state.name).toBe('Money');
    expect(state.description).toBe('All of it');
  });

  it('opens a blank draft without a dashboard', () => {
    expect(initialEditorState()).toEqual({ name: '', description: '', widgets: [] });
  });
});

describe('editorReducer', () => {
  it('adds a report widget at the end at half width', () => {
    const next = editorReducer(start([report('a')]), { type: 'ADD_REPORT', report: { id: 'r9', name: 'Spend', type: 'KPI' } });
    expect(next.widgets).toHaveLength(2);
    expect(next.widgets[1]).toMatchObject({ kind: 'report', reportId: 'r9', title: null, layout: { w: 50 } });
  });

  it('adds a built-in with its params, starting at the width its minimum allows, and the title override', () => {
    const next = editorReducer(start(), { type: 'ADD_BUILTIN', def: netWorthDef, params: { b: 1, a: 2 }, title: '  Money now ' });
    expect(next.widgets[0]).toMatchObject({ kind: 'builtin', builtinKey: 'net_worth', title: 'Money now', params: { a: 2, b: 1 }, layout: { w: 25 } });
    const full = editorReducer(start(), { type: 'ADD_BUILTIN', def: { ...netWorthDef, minW: 100 }, params: {} });
    expect(full.widgets[0].layout.w).toBe(100);
  });

  it('adds the same built-in twice as two widgets', () => {
    let state = start();
    for (let i = 0; i < 2; i++) state = editorReducer(state, { type: 'ADD_BUILTIN', def: cardDef, params: { accountId: `c${i}` } });
    expect(state.widgets.map((w) => w.builtinKey)).toEqual(['card_utilisation', 'card_utilisation']);
    expect(new Set(state.widgets.map((w) => w.id)).size).toBe(2);
  });

  it('adds a header on top, full width, and edits its title and description', () => {
    let state = editorReducer(start([report('a')]), { type: 'ADD_HEADER' });
    const id = state.widgets[0].id;
    expect(state.widgets[0]).toMatchObject({ kind: 'text', title: '', layout: { w: 100 } });
    state = editorReducer(state, { type: 'UPDATE_HEADER', id, change: { title: 'This month', description: 'Spend and bills' } });
    expect(state.widgets[0]).toMatchObject({ title: 'This month', params: { description: 'Spend and bills' } });
  });

  it('removes a widget', () => {
    const next = editorReducer(start([report('a'), report('b')]), { type: 'REMOVE', id: 'a' });
    expect(next.widgets.map((w) => w.id)).toEqual(['b']);
  });

  it('reorders and resizes through a grid layout, and ignores an unchanged one', () => {
    const state = start([report('a'), report('b')]);
    const moved = editorReducer(state, {
      type: 'LAYOUT',
      layout: [
        { id: 'b', width: 'full' },
        { id: 'a', width: 'half' },
      ],
    });
    expect(moved.widgets.map((w) => [w.id, w.layout.w])).toEqual([
      ['b', 100],
      ['a', 50],
    ]);
    expect(
      editorReducer(state, {
        type: 'LAYOUT',
        layout: [
          { id: 'a', width: 'half' },
          { id: 'b', width: 'half' },
        ],
      }),
    ).toBe(state);
  });

  it('saves a widget\'s settings: its params and title (blank clears the title)', () => {
    const state = editorReducer(start(), { type: 'ADD_BUILTIN', def: cardDef, params: { accountId: 'c1' } });
    const id = state.widgets[0].id;
    const next = editorReducer(state, { type: 'SETTINGS', id, params: { accountId: 'c2' }, title: 'Atlas' });
    expect(next.widgets[0]).toMatchObject({ params: { accountId: 'c2' }, title: 'Atlas' });
    expect(editorReducer(next, { type: 'SETTINGS', id, title: '  ' }).widgets[0]).toMatchObject({ params: { accountId: 'c2' }, title: null });
  });

  it('sets the name and description, and a reset replaces the draft', () => {
    let state = editorReducer(start(), { type: 'SET_NAME', name: 'New' });
    state = editorReducer(state, { type: 'SET_DESCRIPTION', description: 'Notes' });
    expect(state).toMatchObject({ name: 'New', description: 'Notes' });
    expect(editorReducer(state, { type: 'RESET', state: start() })).toEqual(start());
  });
});

describe('unsaved changes', () => {
  const base = () => start([report('a'), report('b', { x: 50 })]);

  it('is clean when nothing changed, including a read-only round trip through the grid', () => {
    const state = base();
    const sig = editorSignature(state);
    expect(editorSignature(editorReducer(state, { type: 'LAYOUT', layout: state.widgets.map((w) => ({ id: w.id, width: 'half' as const })) }))).toBe(sig);
  });

  it('turns dirty on a name, add, remove, reorder, resize and settings change', () => {
    const sig = editorSignature(base());
    const changed = [
      editorReducer(base(), { type: 'SET_NAME', name: 'Other' }),
      editorReducer(base(), { type: 'ADD_REPORT', report: { id: 'r9', name: 'x', type: 'KPI' } }),
      editorReducer(base(), { type: 'REMOVE', id: 'a' }),
      editorReducer(base(), { type: 'LAYOUT', layout: [{ id: 'b', width: 'half' }, { id: 'a', width: 'half' }] }),
      editorReducer(base(), { type: 'LAYOUT', layout: [{ id: 'a', width: 'full' }, { id: 'b', width: 'half' }] }),
      editorReducer(base(), { type: 'SETTINGS', id: 'a', title: 'T' }),
    ];
    for (const state of changed) expect(editorSignature(state)).not.toBe(sig);
  });

  it('is clean again after the change is undone', () => {
    const state = base();
    const there = editorReducer(state, { type: 'REMOVE', id: 'a' });
    expect(editorSignature(editorReducer(there, { type: 'RESET', state }))).toBe(editorSignature(state));
  });
});

describe('saveBody', () => {
  it('trims the name, drops an empty description and writes the flowed layout', () => {
    let state = editorReducer(start(), { type: 'SET_NAME', name: '  Cards  ' });
    state = editorReducer(state, { type: 'SET_DESCRIPTION', description: '   ' });
    state = editorReducer(state, { type: 'ADD_REPORT', report: { id: 'r1', name: 'x', type: 'KPI' } });
    state = editorReducer(state, { type: 'ADD_REPORT', report: { id: 'r2', name: 'y', type: 'KPI' } });
    const body = saveBody(state, true);
    expect(body).toMatchObject({ name: 'Cards', description: undefined, isDefault: true });
    expect(body.widgets.map((w) => [w.reportId, w.layout.x, w.layout.y, w.layout.w])).toEqual([
      ['r1', 0, 0, 50],
      ['r2', 50, 0, 50],
    ]);
  });
});

describe('widgetIssues', () => {
  it('says to pick a card when a built-in needs one', () => {
    const state = editorReducer(start(), { type: 'ADD_BUILTIN', def: cardDef, params: {} });
    expect(widgetIssues(state.widgets, [cardDef]).get(state.widgets[0].id)).toBe('Pick a card for this widget.');
  });

  it('has no issue once the param is set, nor for a built-in without params', () => {
    let state = editorReducer(start(), { type: 'ADD_BUILTIN', def: cardDef, params: { accountId: 'c1' } });
    state = editorReducer(state, { type: 'ADD_BUILTIN', def: netWorthDef, params: {} });
    expect(widgetIssues(state.widgets, [cardDef, netWorthDef]).size).toBe(0);
  });

  it('asks for a title on an untitled header, and flags a built-in the server no longer has', () => {
    const state = editorReducer(start(), { type: 'ADD_HEADER' });
    expect(widgetIssues(state.widgets, []).get(state.widgets[0].id)).toBe('Give this header a title.');
    const gone: WidgetResponse = { ...report('g'), kind: 'builtin', reportId: null, builtinKey: 'old', builtin: undefined };
    expect(widgetIssues([gone], []).get('g')).toMatch(/no longer available/);
  });
});
