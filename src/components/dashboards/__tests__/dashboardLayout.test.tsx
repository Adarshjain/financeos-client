import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const phone = vi.hoisted(() => ({ value: false }));
vi.mock('@/lib/useMediaQuery', () => ({ BELOW_MD_QUERY: 'q', useMediaQuery: () => phone.value }));
const grid = vi.hoisted(() => ({ props: null as null | { layout: Array<Record<string, unknown>>; isDraggable: boolean; isResizable: boolean; cols: number } }));
vi.mock('react-grid-layout/legacy', () => ({
  __esModule: true,
  default: (props: { children: ReactNode }) => {
    grid.props = props as never;
    return <div data-testid="rgl">{props.children}</div>;
  },
  WidthProvider: (c: unknown) => c,
}));
vi.mock('react-grid-layout/css/styles.css', () => ({}));
vi.mock('react-resizable/css/styles.css', () => ({}));

import { AlertCircle } from 'lucide-react';

import { DashboardGrid } from '@/components/dashboards/DashboardGrid';
import { DashboardSelector } from '@/components/dashboards/DashboardSelector';
import { DashboardStack, stackOrder } from '@/components/dashboards/DashboardStack';
import { widgetIcon, widgetVisualKind } from '@/components/dashboards/widgetMeta';
import { WidgetMessage, WidgetReportContent, WidgetSkeleton, WidgetUnavailable } from '@/components/dashboards/WidgetStates';
import type { DashboardResponse, WidgetResponse } from '@/lib/dashboards.types';
import type { KpiData } from '@/lib/reports.types';

const report = (id: string, type: string, x = 0, y = 0): WidgetResponse => ({
  id, kind: 'report', reportId: id, title: null, layout: { x, y, w: 50, h: 10 },
  report: { name: id, type: type as 'KPI', available: true },
});
const builtin = (id: string, key: string, kind: string, templateType: string | null, minW = 50, x = 0, y = 0): WidgetResponse => ({
  id, kind: 'builtin', reportId: null, builtinKey: key, params: {}, title: null, layout: { x, y, w: 100, h: 10 },
  builtin: { category: 'overview', key, label: key, minW, kind, templateType },
});

describe('stackOrder / DashboardStack', () => {
  it('orders by y then x without mutating the input', () => {
    const ws = [report('c', 'KPI', 50, 10), report('a', 'KPI', 50, 0), report('b', 'KPI', 0, 0)];
    expect(stackOrder(ws).map((w) => w.id)).toEqual(['b', 'a', 'c']);
    expect(ws.map((w) => w.id)).toEqual(['c', 'a', 'b']);
  });

  it('gives KPIs 140px, charts/tables 320px (h-80) and component built-ins content height', () => {
    const calls: Array<[string, string]> = [];
    render(
      <DashboardStack
        widgets={[report('k', 'KPI', 0, 0), report('t', 'TABLE', 0, 1), report('c', 'CHART', 0, 2), builtin('i', 'attention', 'component', null, 100, 0, 3), builtin('n', 'net_worth', 'template', 'KPI', 50, 0, 4)]}
        renderWidget={(w, fit) => {
          calls.push([w.id, fit]);
          return <span data-testid={`w-${w.id}`} />;
        }}
      />,
    );
    expect(calls).toEqual([['k', 'fill'], ['t', 'fill'], ['c', 'fill'], ['i', 'content'], ['n', 'fill']]);
    expect(screen.getByTestId('w-k').parentElement).toHaveClass('h-[140px]');
    expect(screen.getByTestId('w-t').parentElement).toHaveClass('h-80');
    expect(screen.getByTestId('w-c').parentElement).toHaveClass('h-80');
    expect(screen.getByTestId('w-n').parentElement).toHaveClass('h-[140px]');
    expect(screen.getByTestId('w-i').parentElement).not.toHaveClass('h-80');
    expect(screen.getByTestId('w-i').parentElement).not.toHaveClass('h-[140px]');
  });
});

describe('DashboardGrid', () => {
  beforeEach(() => {
    phone.value = false;
    grid.props = null;
  });
  const widgets = [report('r', 'KPI'), builtin('b', 'bills_due', 'component', null, 100, 0, 10), builtin('n', 'net_worth', 'template', 'KPI', 50, 0, 20)];

  it('passes each widget its own minW (reports use the floor, built-ins their minimum)', () => {
    render(<DashboardGrid widgets={widgets} editing={false} onLayoutChange={vi.fn()} renderWidget={(w) => <i>{w.id}</i>} />);
    expect(grid.props!.layout.map((l) => [l.i, l.minW])).toEqual([['r', 2], ['b', 100], ['n', 50]]);
    expect(grid.props!.cols).toBe(100);
  });

  it('caps minW at the column count', () => {
    render(<DashboardGrid widgets={[builtin('x', 'k', 'component', null, 250)]} editing={false} onLayoutChange={vi.fn()} renderWidget={() => null} />);
    expect(grid.props!.layout[0].minW).toBe(100);
  });

  it('is drag/resizable only in edit mode', () => {
    const { unmount } = render(<DashboardGrid widgets={widgets} editing={false} onLayoutChange={vi.fn()} renderWidget={() => null} />);
    expect(grid.props).toMatchObject({ isDraggable: false, isResizable: false });
    unmount();
    render(<DashboardGrid widgets={widgets} editing onLayoutChange={vi.fn()} renderWidget={() => null} />);
    expect(grid.props).toMatchObject({ isDraggable: true, isResizable: true });
  });

  it('on a phone in view mode stacks instead of using the grid; editing keeps the grid', () => {
    phone.value = true;
    const { unmount } = render(<DashboardGrid widgets={widgets} editing={false} onLayoutChange={vi.fn()} renderWidget={() => null} />);
    expect(screen.getByTestId('dashboard-stack')).toBeInTheDocument();
    expect(screen.queryByTestId('rgl')).not.toBeInTheDocument();
    unmount();
    render(<DashboardGrid widgets={widgets} editing onLayoutChange={vi.fn()} renderWidget={() => null} />);
    expect(screen.getByTestId('rgl')).toBeInTheDocument();
  });
});

describe('widgetMeta', () => {
  it('visual kind: component built-in, template by type, report by type, default table', () => {
    expect(widgetVisualKind(builtin('a', 'attention', 'component', null))).toBe('component');
    expect(widgetVisualKind(builtin('a', 'net_worth', 'template', 'KPI'))).toBe('kpi');
    expect(widgetVisualKind(builtin('a', 'x', 'template', 'CHART'))).toBe('chart');
    expect(widgetVisualKind(builtin('a', 'upcoming', 'template', 'TABLE'))).toBe('table');
    expect(widgetVisualKind(report('r', 'KPI'))).toBe('kpi');
    expect(widgetVisualKind(report('r', 'CHART'))).toBe('chart');
    expect(widgetVisualKind(report('r', 'PIVOT'))).toBe('table');
  });
  it('icon is distinct per known built-in and falls back to the content shape', () => {
    const icons = ['net_worth', 'attention', 'upcoming', 'bills_due'].map((k) => widgetIcon(builtin('a', k, 'template', 'KPI')));
    expect(new Set(icons).size).toBe(4);
    const kpiReport = widgetIcon(report('r', 'KPI'));
    const chartReport = widgetIcon(report('r', 'CHART'));
    const tableReport = widgetIcon(report('r', 'TABLE'));
    expect(new Set([kpiReport, chartReport, tableReport]).size).toBe(3);
    // A report never takes a built-in icon, and an unknown built-in uses its shape icon.
    expect(widgetIcon(builtin('a', 'unknown_key', 'template', 'KPI'))).toBe(kpiReport);
    expect(icons).not.toContain(kpiReport);
  });
  it('a report widget carrying a builtin key still gets its shape icon', () => {
    const w = { ...report('r', 'KPI'), builtinKey: 'attention' };
    expect(widgetIcon(w)).toBe(widgetIcon(report('r2', 'KPI')));
  });
});

describe('WidgetStates', () => {
  const kpi: KpiData = { type: 'KPI', value: 12, measure: 'amount', aggregation: 'sum', format: 'number', comparison: null, meta: { rowCount: 1, dateRange: null as never } };
  const base = { onPageChange: vi.fn(), onSizeChange: vi.fn(), kind: 'kpi' as const };

  it('skeleton shape: KPI is two bars, others four rows', () => {
    const { container, unmount } = render(<WidgetSkeleton kind="kpi" />);
    expect(container.querySelectorAll('[data-testid="widget-skeleton"] > *')).toHaveLength(2);
    unmount();
    for (const kind of ['table', 'chart', 'component'] as const) {
      const r = render(<WidgetSkeleton kind={kind} />);
      expect(r.container.querySelectorAll('[data-testid="widget-skeleton"] > *')).toHaveLength(4);
      r.unmount();
    }
  });
  it('danger messages are alerts, muted ones are not', () => {
    const { unmount } = render(<WidgetMessage icon={AlertCircle} message="bad" tone="danger" />);
    expect(screen.getByRole('alert')).toHaveTextContent('bad');
    unmount();
    render(<WidgetUnavailable message="gone" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('gone')).toBeInTheDocument();
  });
  it('content precedence: unavailable, error, skeleton, data', () => {
    const { rerender } = render(<WidgetReportContent {...base} available={false} data={kpi} error="e" />);
    expect(screen.getByText('This report is no longer available.')).toBeInTheDocument();
    rerender(<WidgetReportContent {...base} available={false} data={null} error={null} unavailableMessage="custom" />);
    expect(screen.getByText('custom')).toBeInTheDocument();
    rerender(<WidgetReportContent {...base} available data={kpi} error="oops" />);
    expect(screen.getByRole('alert')).toHaveTextContent('oops');
    rerender(<WidgetReportContent {...base} available data={null} error={null} />);
    expect(screen.getByTestId('widget-skeleton')).toBeInTheDocument();
    rerender(<WidgetReportContent {...base} available data={kpi} error={null} />);
    expect(screen.queryByTestId('widget-skeleton')).not.toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});

describe('DashboardSelector', () => {
  const dash = (id: string, name: string) => ({ id, name }) as DashboardResponse;
  const list = [dash('1', 'Home'), dash('2', 'Investing')];

  it('has a full-width trigger inside a flex-1 container and a shrink-0 Chat button', () => {
    render(<DashboardSelector dashboards={list} currentDashboard={list[0]} onSelectDashboard={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Switch dashboard, current: Home' });
    expect(trigger).toHaveClass('w-full');
    expect(trigger.parentElement).toHaveClass('flex-1');
    const chat = screen.getByRole('link', { name: 'Chat with your data' });
    expect(chat).toHaveAttribute('href', '/chat');
    expect(chat).toHaveClass('shrink-0');
    expect(chat).toHaveClass('lg:hidden');
  });

  it('lists dashboards, marks the current, calls back on select and links to View All', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<DashboardSelector dashboards={list} currentDashboard={list[0]} onSelectDashboard={onSelect} />);
    await user.click(screen.getByRole('button', { name: /switch dashboard/i }));
    expect(await screen.findByRole('menuitem', { name: 'Investing' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view all dashboards/i })).toHaveAttribute('href', '/dashboards');
    await user.click(screen.getByRole('menuitem', { name: 'Investing' }));
    expect(onSelect).toHaveBeenCalledWith(list[1]);
  });
});
