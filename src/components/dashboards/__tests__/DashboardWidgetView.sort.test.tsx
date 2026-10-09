import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { DashboardWidgetView } from '@/components/dashboards/DashboardWidgetView';
import { DEFAULT_TABLE_PAGE_SIZE } from '@/components/reports/views/TablePagination';
import { api } from '@/lib/api/client';
import type { WidgetResponse } from '@/lib/dashboards.types';
import type { TableData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

const widget: WidgetResponse = {
  id: 'widget-1',
  kind: 'report',
  reportId: 'rep-1',
  title: 'Spends',
  layout: { x: 0, y: 0, w: 6, h: 4 },
  report: { name: 'Spends', type: 'TABLE', available: true },
};
const tableData = (number: number): TableData => ({
  type: 'TABLE',
  mode: 'raw',
  columns: [{ key: 'name', label: 'Name', type: 'string' }],
  rows: [{ id: `r${number}`, name: `Row ${number}` }],
  page: { number, size: DEFAULT_TABLE_PAGE_SIZE, totalElements: 120, totalPages: 3 },
});
const lastQuery = () => (vi.mocked(api.POST).mock.calls.at(-1)![1] as { params: { query: unknown } }).params.query;

describe('DashboardWidgetView header sort', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.POST).mockImplementation((async (_path: string, init: { params: { query: { page: number } } }) => ({
      data: tableData(init.params.query.page),
    })) as never);
  });

  it('sends the clicked header sort and resets to the first page', async () => {
    renderWithQuery(<DashboardWidgetView widget={widget} />);
    await screen.findByText('Row 0');

    fireEvent.click(screen.getByLabelText('Next page'));
    await screen.findByText('Row 1');
    expect(lastQuery()).toEqual({ page: 1, size: DEFAULT_TABLE_PAGE_SIZE });

    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    await waitFor(() => expect(lastQuery()).toEqual({ page: 0, size: DEFAULT_TABLE_PAGE_SIZE, sort: 'name,asc' }));
    await waitFor(() => expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'ascending'));
  });

  it('drops the sort param once the cycle returns to the default order', async () => {
    renderWithQuery(<DashboardWidgetView widget={widget} />);
    await screen.findByText('Row 0');
    const header = () => screen.getByRole('columnheader', { name: 'Name' });

    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    await waitFor(() => expect(header()).toHaveAttribute('aria-sort', 'ascending'));
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    await waitFor(() => expect(lastQuery()).toEqual({ page: 0, size: DEFAULT_TABLE_PAGE_SIZE, sort: 'name,desc' }));
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    await waitFor(() => expect(header()).toHaveAttribute('aria-sort', 'none'));
    await waitFor(() => expect(lastQuery()).toEqual({ page: 0, size: DEFAULT_TABLE_PAGE_SIZE }));
  });
});
