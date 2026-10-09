import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { type BuilderState, initialBuilderState } from '@/components/reports/builderReducer';
import { PreviewPane } from '@/components/reports/PreviewPane';
import { DEFAULT_TABLE_PAGE_SIZE } from '@/components/reports/views/TablePagination';
import { api } from '@/lib/api/client';
import type { DatasourceCatalog, TableData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

const catalog = {
  operators: { number: [], string: [], enum: [], boolean: [], date: { absolute: [], relative: [] } },
  fields: [
    { name: 'name', label: 'Name', type: 'string', role: 'dimension', allowedInReports: ['TABLE'] },
    { name: 'note', label: 'Note', type: 'string', role: 'dimension', allowedInReports: ['TABLE'] },
  ],
} as unknown as DatasourceCatalog;

const rawState = (columns: string[]): BuilderState => {
  const state = initialBuilderState('TABLE', undefined, 'items');
  state.table.raw.columns = columns;
  return state;
};
const tableData = (number: number): TableData => ({
  type: 'TABLE',
  mode: 'raw',
  columns: [{ key: 'name', label: 'Name', type: 'string' }],
  rows: [{ id: `r${number}`, name: `Row ${number}` }],
  page: { number, size: DEFAULT_TABLE_PAGE_SIZE, totalElements: 120, totalPages: 3 },
});
const lastQuery = () => (vi.mocked(api.POST).mock.calls.at(-1)![1] as { params: { query: unknown } }).params.query;

describe('PreviewPane header sort', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.POST).mockImplementation((async (_path: string, init: { params: { query: { page: number } } }) => ({
      data: tableData(init.params.query.page),
    })) as never);
  });

  it('re-runs with the clicked header sort from the first page', async () => {
    renderWithQuery(<PreviewPane state={rawState(['name'])} catalog={catalog} autoRunOnMount />);
    await screen.findByText('Row 0');
    fireEvent.click(screen.getByLabelText('Next page'));
    await screen.findByText('Row 1');

    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    await waitFor(() => expect(lastQuery()).toEqual({ page: 0, size: DEFAULT_TABLE_PAGE_SIZE, sort: 'name,asc' }));
    await waitFor(() => expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'ascending'));
  });

  it('keeps the sort while paging', async () => {
    renderWithQuery(<PreviewPane state={rawState(['name'])} catalog={catalog} autoRunOnMount />);
    await screen.findByText('Row 0');
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    await waitFor(() => expect(lastQuery()).toMatchObject({ sort: 'name,asc' }));
    await screen.findByText('Row 0');

    fireEvent.click(screen.getByLabelText('Next page'));
    await waitFor(() => expect(lastQuery()).toEqual({ page: 1, size: DEFAULT_TABLE_PAGE_SIZE, sort: 'name,asc' }));
  });

  it('keeps showing and paging with the run sort when an edit is reverted', async () => {
    const { rerender } = renderWithQuery(<PreviewPane state={rawState(['name'])} catalog={catalog} autoRunOnMount />);
    await screen.findByText('Row 0');
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    await waitFor(() => expect(lastQuery()).toMatchObject({ sort: 'name,desc' }));
    await screen.findByText('Row 0');

    rerender(<PreviewPane state={rawState(['name', 'note'])} catalog={catalog} autoRunOnMount />);
    expect(await screen.findByRole('button', { name: /refresh preview/i })).toBeInTheDocument();
    rerender(<PreviewPane state={rawState(['name'])} catalog={catalog} autoRunOnMount />);
    expect(screen.queryByRole('button', { name: /refresh preview/i })).not.toBeInTheDocument();
    // The rows on screen are still name-desc, and the header says so.
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'descending');

    fireEvent.click(screen.getByLabelText('Next page'));
    await waitFor(() => expect(lastQuery()).toEqual({ page: 1, size: DEFAULT_TABLE_PAGE_SIZE, sort: 'name,desc' }));
    await screen.findByText('Row 1');
    // The next header click continues the cycle from desc: back to the default order.
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    await waitFor(() => expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'none'));
  });

  it('drops the sort when the definition changes', async () => {
    const { rerender } = renderWithQuery(<PreviewPane state={rawState(['name'])} catalog={catalog} autoRunOnMount />);
    await screen.findByText('Row 0');
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    await waitFor(() => expect(lastQuery()).toMatchObject({ sort: 'name,asc' }));

    rerender(<PreviewPane state={rawState(['name', 'note'])} catalog={catalog} autoRunOnMount />);
    fireEvent.click(await screen.findByRole('button', { name: /refresh preview/i }));
    await waitFor(() => expect(lastQuery()).toEqual({ page: 0, size: DEFAULT_TABLE_PAGE_SIZE }));
  });
});
