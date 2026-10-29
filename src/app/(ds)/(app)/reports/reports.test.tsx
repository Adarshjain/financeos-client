import { screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReportsListData } from '@/features/reports/list/reportsListData';
import type { Loaded } from '@/features/shell/loadHelpers';
import { renderWithQuery } from '@/test/renderWithQuery';

import Layout from './(list)/layout';
import Loading from './(list)/loading';
import ReportsPage from './(list)/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/reports',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/query/hooks/useDashboards', () => ({
  useDashboards: () => ({ data: [], isLoading: false }),
  putWidgets: vi.fn(),
  storeSavedDashboard: vi.fn(),
}));

const loadReportsList = vi.fn<() => Promise<Loaded<ReportsListData>>>();
vi.mock('@/features/reports/list/reportsListData', () => ({ loadReportsList: () => loadReportsList() }));

const data: ReportsListData = {
  datasourceLabels: { transactions: 'Transactions' },
  reports: [
    {
      id: 'r1',
      name: 'Spend this month',
      description: null,
      type: 'KPI',
      datasource: 'transactions',
      createdAt: '2026-10-01T05:00:00Z',
      updatedAt: '2026-10-20T05:00:00Z',
      dashboards: [],
    },
  ],
};

beforeEach(() => vi.clearAllMocks());

describe('/reports', () => {
  it('loads every report once, before the first render, and applies the type in the URL to it', async () => {
    loadReportsList.mockResolvedValue({ ok: true, data });
    renderWithQuery(await ReportsPage({ searchParams: Promise.resolve({ type: 'KPI' }) }));
    expect(loadReportsList).toHaveBeenCalledTimes(1);
    expect(loadReportsList).toHaveBeenCalledWith();
    expect(screen.getByText('Spend this month')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Dashboards$/ })).toBeInTheDocument();
  });

  it('shows no report of another type than the one in the URL', async () => {
    loadReportsList.mockResolvedValue({ ok: true, data });
    renderWithQuery(await ReportsPage({ searchParams: Promise.resolve({ type: 'TABLE' }) }));
    expect(screen.queryByText('Spend this month')).toBeNull();
    expect(screen.getByText('No reports match')).toBeInTheDocument();
  });

  it('treats an unknown type as All', async () => {
    loadReportsList.mockResolvedValue({ ok: true, data });
    renderWithQuery(await ReportsPage({ searchParams: Promise.resolve({ type: 'bogus' }) }));
    expect(screen.getByText('Spend this month')).toBeInTheDocument();
  });

  it('says what failed and offers Retry when the list does not load', async () => {
    loadReportsList.mockResolvedValue({ ok: false, reference: 'req-42' });
    renderWithQuery(await ReportsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Couldn't load reports")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByText(/req-42/)).toBeInTheDocument();
  });

  it('wraps the page in the Reports frame with the Add report +', () => {
    renderWithQuery(<Layout>body</Layout>);
    expect(screen.getByRole('link', { name: 'Add report' })).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('shows the tabs and the table frame while loading', () => {
    renderWithQuery(<Loading />);
    expect(screen.getByRole('tab', { name: 'Reports' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
