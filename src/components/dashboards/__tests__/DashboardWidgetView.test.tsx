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
    reportId: 'rep-123',
    title: 'Monthly Expenses',
    layout: { x: 0, y: 0, w: 6, h: 4 },
    report: {
      name: 'Monthly Expenses Report',
      type: 'TABLE',
      available: true,
    },
  };

  it('renders quick edit report icon link in view mode', () => {
    vi.mocked(api.POST).mockResolvedValue({ data: sampleTableData } as never);

    renderWithQuery(<DashboardWidgetView widget={sampleWidget} />);

    expect(screen.getByText('Monthly Expenses')).toBeInTheDocument();

    const editLinks = screen.getAllByRole('link', { name: /edit report/i });
    expect(editLinks.length).toBeGreaterThanOrEqual(1);
    expect(editLinks[0]).toHaveAttribute('href', '/reports/rep-123');
  });

  it('renders quick edit report icon link in edit mode', () => {
    vi.mocked(api.POST).mockResolvedValue({ data: sampleTableData } as never);

    renderWithQuery(<DashboardWidgetView widget={sampleWidget} editing={true} />);

    const editLink = screen.getByRole('link', { name: /edit report/i });
    expect(editLink).toHaveAttribute('href', '/reports/rep-123');
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
