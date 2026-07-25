import { describe, expect, it } from 'vitest';

import {
  DASHBOARD_GRID_COLUMNS,
  isLayoutWithinGrid,
  validateWidgets,
} from './dashboards.helpers';
import type { DashboardWidget, WidgetLayout } from './dashboards.types';

const layout = (over: Partial<WidgetLayout> = {}): WidgetLayout =>
  ({ x: 0, y: 0, w: 10, h: 24, ...over }) as WidgetLayout;

const widget = (id: string, over: Partial<WidgetLayout> = {}): DashboardWidget =>
  ({ id, reportId: `r-${id}`, title: null, layout: layout(over) }) as DashboardWidget;

describe('isLayoutWithinGrid', () => {
  it('accepts a widget inside the grid', () => {
    expect(isLayoutWithinGrid(layout())).toBe(true);
  });

  it('accepts a widget flush against the right edge', () => {
    expect(
      isLayoutWithinGrid(layout({ x: DASHBOARD_GRID_COLUMNS - 10, w: 10 })),
    ).toBe(true);
  });

  it('accepts a full-width widget', () => {
    expect(isLayoutWithinGrid(layout({ x: 0, w: DASHBOARD_GRID_COLUMNS }))).toBe(true);
  });

  it('rejects a widget overflowing the right edge by one column', () => {
    expect(
      isLayoutWithinGrid(layout({ x: DASHBOARD_GRID_COLUMNS - 10, w: 11 })),
    ).toBe(false);
  });

  it('rejects negative coordinates', () => {
    expect(isLayoutWithinGrid(layout({ x: -1 }))).toBe(false);
    expect(isLayoutWithinGrid(layout({ y: -1 }))).toBe(false);
  });

  it('rejects zero or negative size', () => {
    expect(isLayoutWithinGrid(layout({ w: 0 }))).toBe(false);
    expect(isLayoutWithinGrid(layout({ h: 0 }))).toBe(false);
  });

  it('rejects fractional coordinates', () => {
    expect(isLayoutWithinGrid(layout({ x: 1.5 }))).toBe(false);
    expect(isLayoutWithinGrid(layout({ w: 10.5 }))).toBe(false);
  });

  it('allows unbounded vertical growth', () => {
    expect(isLayoutWithinGrid(layout({ y: 9999 }))).toBe(true);
  });
});

describe('validateWidgets', () => {
  it('passes a valid set', () => {
    expect(validateWidgets([widget('a'), widget('b', { y: 24 })])).toEqual([]);
  });

  it('flags duplicate widget ids', () => {
    const errors = validateWidgets([widget('a'), widget('a')]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Duplicate widget id');
  });

  it('flags an out-of-bounds widget by its 1-based position', () => {
    const errors = validateWidgets([
      widget('a'),
      widget('b', { x: DASHBOARD_GRID_COLUMNS, w: 5 }),
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Widget 2');
  });

  it('reports the grid width it actually validates against', () => {
    // Regression guard: the message hardcoded "12-column" while the constant
    // was 100, so the error told the user something untrue.
    const errors = validateWidgets([widget('a', { x: DASHBOARD_GRID_COLUMNS, w: 5 })]);
    expect(errors[0]).toContain(String(DASHBOARD_GRID_COLUMNS));
    expect(errors[0]).not.toContain('12-column');
  });

  it('accumulates multiple problems', () => {
    const errors = validateWidgets([
      widget('a'),
      widget('a'),
      widget('c', { w: 0 }),
    ]);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  it('accepts an empty dashboard', () => {
    expect(validateWidgets([])).toEqual([]);
  });
});
