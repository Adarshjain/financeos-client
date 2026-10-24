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
  usePathname: () => '/ds/reports',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/query/hooks/useDashboards', () => ({
  useDashboards: () => ({ data: [], isLoading: false }),
  putWidgets: vi.fn(),
  storeSavedDashboard: vi.fn(),
}));

const loadReportsList = vi.fn<(type?: string) => Promise<Loaded<ReportsListData>>>();
vi.mock('@/features/reports/list/reportsListData', () => ({ loadReportsList: (t?: string) => loadReportsList(t) }));

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

describe('/ds/reports', () => {
  it('asks the server for the type in the URL, before the first render', async () => {
    loadReportsList.mockResolvedValue({ ok: true, data });
    renderWithQuery(await ReportsPage({ searchParams: Promise.resolve({ type: 'KPI' }) }));
    expect(loadReportsList).toHaveBeenCalledTimes(1);
    expect(loadReportsList).toHaveBeenCalledWith('KPI');
    expect(screen.getByText('Spend this month')).toBeInTheDocument();
  });

  it('treats an unknown type as All', async () => {
    loadReportsList.mockResolvedValue({ ok: true, data });
    await ReportsPage({ searchParams: Promise.resolve({ type: 'bogus' }) });
    expect(loadReportsList).toHaveBeenCalledWith(undefined);
  });

  it('says what failed and offers Try again when the list does not load', async () => {
    loadReportsList.mockResolvedValue({ ok: false, reference: 'req-42' });
    renderWithQuery(await ReportsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText('Could not load reports')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByText(/req-42/)).toBeInTheDocument();
  });

  it('wraps the page in the Reports frame with its tabs', () => {
    renderWithQuery(<Layout>body</Layout>);
    expect(screen.getByRole('tab', { name: 'Reports' })).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('shows the table frame while loading', () => {
    renderWithQuery(<Loading />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
