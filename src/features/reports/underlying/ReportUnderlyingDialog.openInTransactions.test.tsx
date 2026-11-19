import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { api } from '@/lib/api/client';
import { CATEGORY_LIST_FIXTURE } from '@/lib/categoryList.fixtures';
import type { FilterClause, RunReportRequest } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { ReportUnderlyingDialog } from './ReportUnderlyingDialog';

const user = userEvent.setup({ pointerEventsCheck: 0 });

const kpi = (filters: FilterClause[], datasource = 'transactions'): RunReportRequest => ({
  type: 'KPI',
  datasource,
  definition: { measure: 'amount', aggregation: 'sum', filters },
});

const page = (period: string) => ({
  period,
  datasource: 'transactions',
  measure: 'amount',
  measureLabel: 'Amount',
  aggregation: 'sum',
  format: 'currency',
  value: 1200,
  rowCount: 1,
  range: { from: '2026-11-01', to: '2026-11-30' },
  previousAvailable: true,
  previousRange: { from: '2026-10-01', to: '2026-10-31' },
  filters: [],
  notCounted: [],
  summaryLines: [],
  winnerOnly: false,
  table: {
    type: 'TABLE',
    mode: 'raw',
    columns: [{ key: 'amount', label: 'Amount', type: 'number', format: 'currency' }],
    rows: [{ id: 't1', amount: 1200 }],
    page: { number: 0, size: 25, totalElements: 1, totalPages: 1 },
  },
});

const categoryListCalls = () => vi.mocked(api.GET).mock.calls.filter((c) => String(c[0]).includes('category-list'));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.POST).mockImplementation(((_path: string, init: { params: { query: { period: string } } }) =>
    Promise.resolve({ data: page(init.params.query.period) })) as never);
  vi.mocked(api.GET).mockResolvedValue({ data: { categories: CATEGORY_LIST_FIXTURE } } as never);
});

const link = () => screen.queryByRole('link', { name: 'Open in Transactions' });
const loaded = () => screen.findByText(/Underlying data ·/);

describe('ReportUnderlyingDialog Open in Transactions', () => {
  it('links to Transactions with the report period and the flags left out', async () => {
    renderWithQuery(
      <ReportUnderlyingDialog
        request={kpi([{ field: 'date', operator: 'this_month' }, { field: 'countsInTotals', operator: 'is', value: true }])}
        onClose={vi.fn()}
      />,
    );
    await loaded();
    expect(link()).toHaveAttribute('href', '/transactions?period=this_month');
  });

  it('does not fetch the category list when no category clause needs it', async () => {
    renderWithQuery(<ReportUnderlyingDialog request={kpi([{ field: 'date', operator: 'this_month' }])} onClose={vi.fn()} />);
    await loaded();
    expect(categoryListCalls()).toHaveLength(0);
  });

  it('resolves a category pin to its key once the category list has loaded', async () => {
    renderWithQuery(
      <ReportUnderlyingDialog
        request={kpi([{ field: 'date', operator: 'this_month' }, { field: 'category', operator: 'is', value: 'Food' }])}
        onClose={vi.fn()}
      />,
    );
    await loaded();
    await waitFor(() => expect(link()).toHaveAttribute('href', '/transactions?period=this_month&category=food'));
    expect(categoryListCalls()).toHaveLength(1);
  });

  it('is absent for a filter Transactions cannot say exactly', async () => {
    renderWithQuery(<ReportUnderlyingDialog request={kpi([{ field: 'tag', operator: 'is', value: 'Trip' }])} onClose={vi.fn()} />);
    await loaded();
    expect(link()).toBeNull();
  });

  it('is absent for another datasource', async () => {
    renderWithQuery(<ReportUnderlyingDialog request={kpi([], 'dividends')} onClose={vi.fn()} />);
    await loaded();
    expect(link()).toBeNull();
  });

  it('is absent on the previous period, whose rows the link would not match', async () => {
    renderWithQuery(<ReportUnderlyingDialog request={kpi([{ field: 'date', operator: 'this_month' }])} onClose={vi.fn()} />);
    await loaded();
    expect(link()).not.toBeNull();
    await user.click(screen.getByRole('tab', { name: 'Previous period' }));
    await waitFor(() => expect(link()).toBeNull());
    await user.click(screen.getByRole('tab', { name: 'This period' }));
    await waitFor(() => expect(link()).not.toBeNull());
  });

  it('closes the dialog when it is followed', async () => {
    const onClose = vi.fn();
    renderWithQuery(<ReportUnderlyingDialog request={kpi([])} onClose={onClose} />);
    await loaded();
    const open = link()!;
    open.addEventListener('click', (e) => e.preventDefault());
    await user.click(open);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
