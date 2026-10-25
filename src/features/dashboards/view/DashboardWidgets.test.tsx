import { screen, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));
const useWidgetData = vi.hoisted(() => vi.fn());
vi.mock('../data/useWidgetData', () => ({ useWidgetData }));
vi.mock('../builtins/registry', () => ({ builtinPieces: () => null, builtinHasParamsEditor: () => false, builtinParamsEditor: () => null }));
vi.mock('../frame/ReportWidgetBody', () => ({ ReportWidgetBody: ({ widget }: { widget: { id: string } }) => <div data-testid={`body-${widget.id}`} /> }));

import type { WidgetResponse } from '@/lib/dashboards.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { DashboardWidgets } from './DashboardWidgets';

const report = (id: string, name: string, layout: Partial<WidgetResponse['layout']> = {}): WidgetResponse => ({
  id,
  kind: 'report',
  reportId: `r-${id}`,
  title: null,
  layout: { x: 0, y: 0, w: 50, h: 24, ...layout },
  report: { name, type: 'KPI', available: true },
});

describe('DashboardWidgets', () => {
  it('one widget failing never blanks the others', () => {
    useWidgetData.mockImplementation((w: WidgetResponse) =>
      w.id === 'bad'
        ? { available: true, data: null, error: 'Prices service did not answer.', loading: false, refetch: vi.fn() }
        : { available: true, data: { type: 'KPI' }, error: null, loading: false, refetch: vi.fn() },
    );
    renderWithQuery(<DashboardWidgets widgets={[report('ok', 'Spend'), report('bad', 'Portfolio', { x: 50 }), report('ok2', 'Rewards', { y: 24 })]} />);
    const widgets = screen.getAllByTestId('dashboard-widget');
    expect(widgets).toHaveLength(3);
    expect(within(widgets[1]).getByText("Couldn't load this widget")).toBeInTheDocument();
    expect(screen.getByTestId('body-ok')).toBeInTheDocument();
    expect(screen.getByTestId('body-ok2')).toBeInTheDocument();
    expect(screen.queryByTestId('body-bad')).toBeNull();
  });

  it('shows a section header as a heading, full width, with its description', () => {
    useWidgetData.mockReturnValue({ available: true, data: { type: 'KPI' }, error: null, loading: false, refetch: vi.fn() });
    const header: WidgetResponse = { id: 'h', kind: 'text', reportId: null, title: 'This month', params: { description: 'Spend and bills' }, layout: { x: 0, y: 0, w: 100, h: 6 } };
    const { container } = renderWithQuery(<DashboardWidgets widgets={[report('a', 'Spend', { y: 6 }), header]} />);
    expect(screen.getByRole('heading', { name: 'This month' })).toBeInTheDocument();
    expect(screen.getByText('Spend and bills')).toBeInTheDocument();
    const items = [...container.querySelectorAll('[data-widget-grid-item]')];
    expect(items.map((i) => i.getAttribute('data-widget-grid-item'))).toEqual(['h', 'a']);
    expect(items.map((i) => i.getAttribute('data-width'))).toEqual(['full', 'half']);
  });

  it('shows the widgets in saved y then x order with the saved widths', () => {
    useWidgetData.mockReturnValue({ available: true, data: { type: 'KPI' }, error: null, loading: false, refetch: vi.fn() });
    const { container } = renderWithQuery(
      <DashboardWidgets widgets={[report('c', 'C', { x: 75, y: 0, w: 25 }), report('a', 'A', { x: 0, y: 0, w: 75 }), report('b', 'B', { y: 24, w: 100 })]} />,
    );
    const items = [...container.querySelectorAll('[data-widget-grid-item]')];
    expect(items.map((i) => [i.getAttribute('data-widget-grid-item'), i.getAttribute('data-width')])).toEqual([
      ['a', 'three-quarters'],
      ['c', 'quarter'],
      ['b', 'full'],
    ]);
  });
});
