import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { DashboardWidgetView } from '@/components/dashboards/DashboardWidgetView';
import { api } from '@/lib/api/client';
import type { WidgetResponse } from '@/lib/dashboards.types';
import type { TableData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

const sampleTableData: TableData = {
  type: 'TABLE',
  mode: 'raw',
  columns: [],
  rows: [],
  page: { number: 0, size: 20, totalElements: 0, totalPages: 0 },
};

describe('DashboardWidgetView', () => {
  const sampleWidget: WidgetResponse = {
    id: 'widget-1',
    kind: 'report',
    reportId: 'rep-123',
    title: 'Monthly Expenses',
    layout: { x: 0, y: 0, w: 6, h: 4 },
    report: {
      name: 'Monthly Expenses Report',
      type: 'TABLE',
      available: true,
    },
  };

  it('offers report actions through the overflow menu, with no separate Open link, in view mode', () => {
    vi.mocked(api.POST).mockResolvedValue({ data: sampleTableData } as never);

    renderWithQuery(<DashboardWidgetView widget={sampleWidget} />);

    expect(screen.getByText('Monthly Expenses')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open monthly expenses/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /more actions/i })).toBeInTheDocument();
  });

  it('renders quick edit report icon link in edit mode', () => {
    vi.mocked(api.POST).mockResolvedValue({ data: sampleTableData } as never);

    renderWithQuery(<DashboardWidgetView widget={sampleWidget} editing={true} />);

    const editLink = screen.getByRole('link', { name: /edit report/i });
    expect(editLink).toHaveAttribute('href', '/reports/rep-123');
  });

  it('edit mode: drags by the grip only, never by the title input or the controls', () => {
    vi.mocked(api.POST).mockResolvedValue({ data: sampleTableData } as never);

    renderWithQuery(<DashboardWidgetView widget={sampleWidget} editing={true} />);

    const widget = screen.getByTestId('dashboard-widget');
    expect(widget.querySelectorAll('.dashboard-drag-handle')).toHaveLength(1);
    expect(screen.getByLabelText('Widget title').closest('.dashboard-drag-handle')).toBeNull();
    expect(screen.getByRole('link', { name: /edit report/i }).closest('.dashboard-drag-handle')).toBeNull();
    expect(screen.getByRole('button', { name: /remove widget/i }).closest('.dashboard-drag-handle')).toBeNull();
  });

  it('edit mode: lays a shield over the content and makes the content inert', () => {
    vi.mocked(api.POST).mockResolvedValue({ data: sampleTableData } as never);

    renderWithQuery(<DashboardWidgetView widget={sampleWidget} editing={true} />);

    const shield = screen.getByTestId('dashboard-widget-shield');
    expect(shield).toHaveClass('absolute', 'inset-0');
    const content = shield.previousElementSibling as HTMLElement;
    expect(content).toHaveAttribute('inert');
    // The header controls stay usable: they are outside the inert content.
    expect(screen.getByLabelText('Widget title').closest('[inert]')).toBeNull();
  });

  it('view mode: no shield and nothing inert', () => {
    vi.mocked(api.POST).mockResolvedValue({ data: sampleTableData } as never);

    renderWithQuery(<DashboardWidgetView widget={sampleWidget} />);

    expect(screen.queryByTestId('dashboard-widget-shield')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboard-widget').querySelector('[inert]')).toBeNull();
  });

  it('does not render edit link when report is unavailable', () => {
    const unavailableWidget: WidgetResponse = {
      ...sampleWidget,
      report: {
        name: 'Report',
        type: 'TABLE',
        available: false,
      },
    };

    renderWithQuery(<DashboardWidgetView widget={unavailableWidget} />);

    expect(screen.queryByRole('link', { name: /edit report/i })).not.toBeInTheDocument();
  });
});
