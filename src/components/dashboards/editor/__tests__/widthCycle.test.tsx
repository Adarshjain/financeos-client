import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { DashboardWidgetView } from '@/components/dashboards/DashboardWidgetView';
import { api } from '@/lib/api/client';
import { newBuiltinWidget, QUARTER_WIDTH } from '@/lib/dashboards.helpers';
import type { BuiltinWidgetResponse, WidgetResponse } from '@/lib/dashboards.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import {
  builtinWidgetResponse,
  canToggleWidth,
  nextWidth,
  toggleWidth,
  widthStops,
  widthToggleLabel,
} from '../dashboardEditor.helpers';

const widget = (minW: number, w: number, x = 0): WidgetResponse => ({
  id: `w${minW}-${w}`,
  kind: 'builtin',
  reportId: null,
  builtinKey: 'shortcuts',
  params: {},
  title: null,
  layout: { x, y: 0, w, h: 10 },
  builtin: { key: 'shortcuts', label: 'Shortcuts', minW, kind: 'template', category: 'shortcuts', templateType: 'KPI' },
});

const def = (minW: number): BuiltinWidgetResponse => ({
  key: 'k', label: 'K', description: '', kind: 'component', minW, category: 'overview', params: [],
  subtitle: 'Sub', view: 'v',
});

describe('width stops', () => {
  it('quarter-capable (minW ≤ 25) cycles ¼ → ½ → full → ¼', () => {
    expect(widthStops(widget(25, 25))).toEqual([25, 50, 100]);
    expect(nextWidth(widget(25, 25))).toBe(50);
    expect(nextWidth(widget(25, 50))).toBe(100);
    expect(nextWidth(widget(25, 100))).toBe(25);
  });

  it('minW 50 keeps ½ ↔ full; a wider minimum uses itself; minW 100 has no toggle', () => {
    expect(widthStops(widget(50, 50))).toEqual([50, 100]);
    expect(nextWidth(widget(50, 50))).toBe(100);
    expect(nextWidth(widget(50, 100))).toBe(50);
    expect(widthStops(widget(70, 100))).toEqual([70, 100]);
    expect(widthStops(widget(100, 100))).toEqual([]);
    expect(nextWidth(widget(100, 100))).toBeNull();
    expect(canToggleWidth(widget(100, 100))).toBe(false);
    expect(canToggleWidth(widget(25, 25))).toBe(true);
  });

  it('a saved-report widget keeps ½ ↔ full (no quarter stop, whatever its grid floor)', () => {
    const report: WidgetResponse = {
      id: 'r', kind: 'report', reportId: 'rep', title: null, layout: { x: 0, y: 0, w: 100, h: 10 },
      report: { name: 'R', type: 'TABLE', available: true },
    };
    expect(widthStops(report)).toEqual([50, 100]);
    expect(nextWidth(report)).toBe(50);
    expect(widthToggleLabel(report)).toBe('Collapse to half width');
  });

  it('a hand-resized width moves to the next wider stop', () => {
    expect(nextWidth(widget(25, 37))).toBe(50);
    expect(nextWidth(widget(25, 80))).toBe(100);
    expect(nextWidth(widget(50, 60))).toBe(100);
  });

  it('labels name the next stop and its direction', () => {
    expect(widthToggleLabel(widget(25, 25))).toBe('Expand to half width');
    expect(widthToggleLabel(widget(25, 50))).toBe('Expand to full width');
    expect(widthToggleLabel(widget(25, 100))).toBe('Collapse to quarter width');
    expect(widthToggleLabel(widget(50, 100))).toBe('Collapse to half width');
    expect(widthToggleLabel(widget(70, 100))).toBe('Collapse to minimum width');
    expect(widthToggleLabel(widget(100, 100))).toBe('This widget needs the full width');
  });

  it('toggleWidth applies the next stop and keeps the widget inside the grid', () => {
    expect(toggleWidth([widget(25, 25, 75)], 'w25-25')[0].layout).toMatchObject({ w: 50, x: 50 });
    expect(toggleWidth([widget(25, 100)], 'w25-100')[0].layout).toMatchObject({ w: 25, x: 0 });
    const fixed = widget(100, 100);
    expect(toggleWidth([fixed], fixed.id)[0]).toBe(fixed);
  });
});

describe('new widgets', () => {
  it('a built-in with minW 25 is added at quarter width; 50 at half; 70 at its minimum; 100 full', () => {
    expect(newBuiltinWidget(def(25), {}).layout.w).toBe(QUARTER_WIDTH);
    expect(newBuiltinWidget(def(10), {}).layout.w).toBe(QUARTER_WIDTH);
    expect(newBuiltinWidget(def(50), {}).layout.w).toBe(50);
    expect(newBuiltinWidget(def(70), {}).layout.w).toBe(70);
    expect(newBuiltinWidget(def(100), {}).layout.w).toBe(100);
  });

  it('the response shape carries the category, subtitle and view onto the ref', () => {
    const w = builtinWidgetResponse([], def(25), {});
    expect(w.builtin).toMatchObject({ category: 'overview', subtitle: 'Sub', view: 'v', minW: 25 });
    expect(w.layout.w).toBe(25);
  });
});

describe('edit header width toggle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: { type: 'KPI', value: 1, meta: { rowCount: 1 } } } as never);
  });

  it('a quarter widget offers Expand to half width and calls the toggle', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    renderWithQuery(<DashboardWidgetView widget={widget(25, 25)} editing onToggleWidth={onToggle} />);
    await user.click(screen.getByRole('button', { name: 'Expand to half width' }));
    expect(onToggle).toHaveBeenCalled();
  });

  it('a full quarter-capable widget offers Collapse to quarter width', () => {
    renderWithQuery(<DashboardWidgetView widget={widget(25, 100)} editing />);
    expect(screen.getByRole('button', { name: 'Collapse to quarter width' })).toBeEnabled();
  });
});
