import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The actions run in-process here and reach the API through the same mocked `api` these tests already drive.
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('./underlying.helpers', async () => {
  const actual = await vi.importActual<typeof import('./underlying.helpers')>('./underlying.helpers');
  return { ...actual, saveBlob: vi.fn() };
});

import { api } from '@/lib/api/client';
import type { RunReportRequest } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { ReportUnderlyingDialog, shortDate } from './ReportUnderlyingDialog';
import { saveBlob } from './underlying.helpers';
import type { KpiUnderlyingResponse } from './underlying.types';

const user = userEvent.setup({ pointerEventsCheck: 0 });

const request: RunReportRequest = {
  type: 'KPI',
  datasource: 'transactions',
  definition: { measure: 'amount', aggregation: 'sum', filters: [{ field: 'isExcluded', operator: 'is', value: false }] },
};

function response(over: Partial<KpiUnderlyingResponse> = {}, page = { number: 0, size: 25, totalElements: 60, totalPages: 3 }): KpiUnderlyingResponse {
  return {
    period: 'current',
    datasource: 'transactions',
    measure: 'amount',
    measureLabel: 'Amount',
    aggregation: 'sum',
    format: 'currency',
    value: 97044,
    rowCount: 60,
    range: { from: '2026-10-01', to: '2026-10-31' },
    previousAvailable: true,
    previousRange: { from: '2026-09-01', to: '2026-09-30' },
    filters: [],
    notCounted: [],
    summaryLines: [],
    winnerOnly: false,
    table: {
      type: 'TABLE',
      mode: 'raw',
      columns: [
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'description', label: 'Description', type: 'string' },
        { key: 'amount', label: 'Amount', type: 'number', format: 'currency' },
      ],
      rows: [
        { id: 't1', date: '2026-10-05', description: 'SBI Home Loan EMI', amount: 39052 },
        { id: 't2', date: '2026-10-03', description: 'Rent Prestige Lakeside', amount: 32000 },
      ],
      page,
    },
    ...over,
  } as unknown as KpiUnderlyingResponse;
}

/** The query of the latest page request (the CSV excluded). */
const lastQuery = () => {
  const pages = vi.mocked(api.POST).mock.calls.filter((c) => !String(c[0]).endsWith('/csv'));
  return (pages[pages.length - 1][1] as unknown as { params: { query: { period: string; page: number; sort?: string } } }).params.query;
};
const call = (n: number) => vi.mocked(api.POST).mock.calls[n] as unknown as [string, { params: { query: Record<string, unknown> }; body?: unknown }];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.POST).mockImplementation(((path: string, init: { params: { query: { period: string; page?: number } } }) => {
    if (path.endsWith('/csv')) return Promise.resolve({ data: new Blob(['a,b']) });
    const { period, page = 0 } = init.params.query;
    return Promise.resolve({ data: response({ period }, { number: page, size: 25, totalElements: 60, totalPages: 3 }) });
  }) as never);
});

describe('shortDate', () => {
  it('reads a calendar date as day and month', () => {
    expect(shortDate('2026-10-05')).toBe('5 Oct');
    expect(shortDate('n/a')).toBe('n/a');
  });
});

const foodRequest: RunReportRequest = {
  ...request,
  definition: { ...request.definition, filters: [...(request.definition as { filters: unknown[] }).filters, { field: 'category', operator: 'is', value: 'Food' }] },
} as never;
const rentRequest: RunReportRequest = {
  ...request,
  definition: { ...request.definition, filters: [...(request.definition as { filters: unknown[] }).filters, { field: 'category', operator: 'is', value: 'Rent' }] },
} as never;
const entries = [
  { label: 'Food', request: foodRequest },
  { label: 'Rent', request: rentRequest },
];

describe('ReportUnderlyingDialog title', () => {
  it('uses the given title in place of the default one', async () => {
    renderWithQuery(<ReportUnderlyingDialog request={request} title="Emergency fund balance" onClose={vi.fn()} />);
    expect(await screen.findByText('Emergency fund balance')).toBeInTheDocument();
    expect(screen.queryByText(/Underlying data ·/)).toBeNull();
  });
});

describe('ReportUnderlyingDialog footer', () => {
  it('has Download CSV on the left and Close on the right, and Close closes the dialog', async () => {
    const onClose = vi.fn();
    renderWithQuery(<ReportUnderlyingDialog request={request} onClose={onClose} />);
    await screen.findByText('Underlying data · ₹97,044');
    const download = screen.getByRole('button', { name: 'Download CSV' });
    const close = screen.getAllByRole('button', { name: 'Close' }).find((b) => b.textContent === 'Close')!;
    expect(download.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(download.querySelector('svg')).not.toBeNull();
    await user.click(close);
    expect(onClose).toHaveBeenCalled();
  });
});

describe('ReportUnderlyingDialog dimension dropdown', () => {
  it('is not shown without entries', async () => {
    renderWithQuery(<ReportUnderlyingDialog request={request} dimensionLabel="Category" onClose={vi.fn()} />);
    await screen.findByText('Underlying data · ₹97,044');
    expect(screen.queryByRole('button', { name: /Category: All/ })).toBeNull();
  });

  it('starts at Category: All with the whole report, beside the sort control', async () => {
    renderWithQuery(<ReportUnderlyingDialog request={request} entries={entries} dimensionLabel="Category" onClose={vi.fn()} />);
    await screen.findByText('Underlying data · ₹97,044');
    const all = screen.getByRole('button', { name: /Category: All/ });
    expect(all.closest('[class*="justify-end"]')).toBe(screen.getByRole('button', { name: /Sort/ }).closest('[class*="justify-end"]'));
    expect(call(0)[1].body).toEqual(request);
  });

  it('lists the entries and narrows the rows to the one picked, then back to all', async () => {
    renderWithQuery(<ReportUnderlyingDialog request={request} entries={entries} dimensionLabel="Category" onClose={vi.fn()} />);
    await screen.findByText('Underlying data · ₹97,044');
    await user.click(screen.getByRole('button', { name: /Category: All/ }));
    expect(await screen.findByRole('option', { name: 'Food' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Rent' })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Rent' }));
    await waitFor(() => expect(vi.mocked(api.POST).mock.calls.at(-1)?.[1]).toMatchObject({ body: rentRequest }));
    expect(screen.getByRole('button', { name: 'Category: Rent' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Category: Rent' }));
    await user.click(await screen.findByRole('option', { name: 'All' }));
    await waitFor(() => expect(vi.mocked(api.POST).mock.calls.at(-1)?.[1]).toMatchObject({ body: request }));
  });

  it('opens on the row\'s entry, and All goes back to the whole report', async () => {
    renderWithQuery(<ReportUnderlyingDialog request={request} entries={entries} initialEntry={1} dimensionLabel="Category" onClose={vi.fn()} />);
    expect(await screen.findByRole('button', { name: 'Category: Rent' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Category: All' })).toBeNull();
    expect(vi.mocked(api.POST).mock.calls.at(0)?.[1]).toMatchObject({ body: rentRequest });
    await user.click(screen.getByRole('button', { name: 'Category: Rent' }));
    await user.click(await screen.findByRole('option', { name: 'All' }));
    await waitFor(() => expect(vi.mocked(api.POST).mock.calls.at(-1)?.[1]).toMatchObject({ body: request }));
  });

  it('goes back to the first page of this period, and downloads the CSV of the one picked', async () => {
    renderWithQuery(<ReportUnderlyingDialog request={request} entries={entries} dimensionLabel="Category" onClose={vi.fn()} />);
    await screen.findByText('Underlying data · ₹97,044');
    await user.click(screen.getAllByRole('button', { name: 'Page 2' })[0]);
    await waitFor(() => expect(lastQuery().page).toBe(1));
    await user.click(screen.getByRole('tab', { name: 'Previous period' }));
    await waitFor(() => expect(lastQuery().period).toBe('previous'));
    await user.click(screen.getByRole('button', { name: /Category: All/ }));
    await user.click(await screen.findByRole('option', { name: 'Food' }));
    await waitFor(() => expect(lastQuery()).toMatchObject({ period: 'current', page: 0 }));
    await user.click(screen.getByRole('button', { name: 'Download CSV' }));
    await waitFor(() => expect(saveBlob).toHaveBeenCalled());
    const csv = vi.mocked(api.POST).mock.calls.find((c) => String(c[0]).endsWith('/csv')) as unknown as [string, { body: unknown }];
    expect(csv[1].body).toEqual(foodRequest);
  });
});

describe('ReportUnderlyingDialog', () => {
  it('lists the rows with the figure, the count and range in the header', async () => {
    renderWithQuery(<ReportUnderlyingDialog request={request} onClose={vi.fn()} />);
    expect(await screen.findByText('Underlying data · ₹97,044')).toBeInTheDocument();
    expect(screen.getByText('60 transactions make up this figure · Oct · excluded rows hidden')).toBeInTheDocument();
    expect(screen.getAllByText('SBI Home Loan EMI').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5 Oct').length).toBeGreaterThan(0);
    expect(call(0)[0]).toBe('/api/v1/reports/underlying');
    expect(call(0)[1].body).toEqual(request);
  });

  it('switches to the previous period and back to its first page', async () => {
    renderWithQuery(<ReportUnderlyingDialog request={request} onClose={vi.fn()} />);
    await screen.findByText('Underlying data · ₹97,044');
    await user.click(screen.getAllByRole('button', { name: 'Page 2' })[0]);
    await waitFor(() => expect(lastQuery().page).toBe(1));
    await user.click(screen.getByRole('tab', { name: 'Previous period' }));
    await waitFor(() => expect(lastQuery()).toMatchObject({ period: 'previous', page: 0 }));
  });

  it('hides the current rows while the previous period loads', async () => {
    renderWithQuery(<ReportUnderlyingDialog request={request} onClose={vi.fn()} />);
    await screen.findByText('Underlying data · ₹97,044');
    vi.mocked(api.POST).mockImplementation((() => new Promise(() => {})) as never);
    await user.click(screen.getByRole('tab', { name: 'Previous period' }));
    await waitFor(() => expect(screen.queryByText('SBI Home Loan EMI')).not.toBeInTheDocument());
    expect(screen.queryAllByText('SBI Home Loan EMI')).toHaveLength(0);
    expect(screen.getByTestId('underlying-loading')).toBeInTheDocument();
  });

  it('has no period tabs when there is no previous period', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: response({ previousAvailable: false }) } as never);
    renderWithQuery(<ReportUnderlyingDialog request={request} onClose={vi.fn()} />);
    await screen.findByText('Underlying data · ₹97,044');
    expect(screen.queryByRole('tab', { name: 'Previous period' })).not.toBeInTheDocument();
  });

  it('fetches the next page from the server when the pager moves', async () => {
    renderWithQuery(<ReportUnderlyingDialog request={request} onClose={vi.fn()} />);
    await screen.findByText('Underlying data · ₹97,044');
    await user.click(screen.getAllByRole('button', { name: 'Page 2' })[0]);
    await waitFor(() => expect(lastQuery().page).toBe(1));
  });

  it('sorts on the server and returns to the first page', async () => {
    renderWithQuery(<ReportUnderlyingDialog request={request} onClose={vi.fn()} />);
    await screen.findByText('Underlying data · ₹97,044');
    await user.click(screen.getAllByRole('button', { name: 'Page 2' })[0]);
    await waitFor(() => expect(lastQuery().page).toBe(1));
    await user.click(screen.getByRole('button', { name: /Sort/ }));
    await user.click(await screen.findByText('Amount (descending)'));
    await waitFor(() => expect(lastQuery()).toMatchObject({ sort: 'amount,desc', page: 0 }));
  });

  it('downloads every row as CSV for the period and sort on screen', async () => {
    renderWithQuery(<ReportUnderlyingDialog request={request} onClose={vi.fn()} />);
    await screen.findByText('Underlying data · ₹97,044');
    await user.click(screen.getByRole('button', { name: /Sort/ }));
    await user.click(await screen.findByText('Amount (descending)'));
    await waitFor(() => expect(lastQuery().sort).toBe('amount,desc'));
    await user.click(screen.getByRole('button', { name: 'Download CSV' }));
    await waitFor(() => expect(saveBlob).toHaveBeenCalled());
    const csv = vi.mocked(api.POST).mock.calls.find((c) => String(c[0]).endsWith('/csv')) as unknown as [string, { params: { query: unknown }; body: unknown }];
    expect(csv[0]).toBe('/api/v1/reports/underlying/csv');
    expect(csv[1].params.query).toEqual({ period: 'current', sort: 'amount,desc' });
    expect(csv[1].body).toEqual(request);
    expect(vi.mocked(saveBlob).mock.calls[0][1]).toMatch(/\.csv$/);
  });

  it('names what the figure leaves out under the rows', async () => {
    vi.mocked(api.POST).mockResolvedValue({
      data: response({ notCounted: [{ id: 'a', kind: 'account', name: 'Old card', reason: 'closed', reasonLabel: 'Closed account' }] }),
    } as never);
    renderWithQuery(<ReportUnderlyingDialog request={request} onClose={vi.fn()} />);
    expect(await screen.findByText('Excluded from this figure: Old card (Closed account)')).toBeInTheDocument();
  });

  it('shows no footer line when nothing is left out', async () => {
    renderWithQuery(<ReportUnderlyingDialog request={request} onClose={vi.fn()} />);
    await screen.findByText('Underlying data · ₹97,044');
    expect(screen.queryByText(/Excluded from this figure/)).not.toBeInTheDocument();
  });

  it('says so when no rows make up the figure', async () => {
    const empty = response({ rowCount: 0 }, { number: 0, size: 25, totalElements: 0, totalPages: 0 });
    (empty.table as unknown as { rows: unknown[] }).rows = [];
    vi.mocked(api.POST).mockResolvedValue({ data: empty } as never);
    renderWithQuery(<ReportUnderlyingDialog request={request} onClose={vi.fn()} />);
    expect(await screen.findByText('No rows make up this figure.')).toBeInTheDocument();
  });

  it('shows the error when the rows cannot load', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    renderWithQuery(<ReportUnderlyingDialog request={request} onClose={vi.fn()} />);
    expect(await screen.findByText("Couldn't load the underlying data")).toBeInTheDocument();
    expect(within(document.body).getByText('Underlying data')).toBeInTheDocument();
  });
});
