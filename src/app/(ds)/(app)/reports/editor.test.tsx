import { screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { catalogFixture, savedChart } from '@/features/reports/builder/editor.fixtures';
import type { NewReportData, SavedReportData } from '@/features/reports/builder/editorData';
import type { Loaded } from '@/features/shell/loadHelpers';
import type { ChartData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import ReportPage from './[id]/page';
import NewReportPage from './new/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/reports/new',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));
vi.mock('@/components/organisms/Chart/Chart', () => ({ Chart: () => <div data-testid="chart" /> }));

const loadNewReport = vi.fn<() => Promise<Loaded<NewReportData>>>();
const loadSavedReport = vi.fn<(id: string) => Promise<Loaded<SavedReportData>>>();
vi.mock('@/features/reports/builder/editorData', () => ({
  loadNewReport: () => loadNewReport(),
  loadSavedReport: (id: string) => loadSavedReport(id),
}));

const chart: ChartData = {
  type: 'CHART',
  chartType: 'bar',
  dimension: 'category',
  categories: ['Food & dining'],
  series: [{ name: 'Spend', data: [1] }],
  measure: { field: 'spend', aggregation: 'sum' },
  meta: { rowCount: 1, dateRange: null },
};

beforeEach(() => {
  vi.clearAllMocks();
  api.GET.mockResolvedValue({ data: undefined });
});

describe('/reports/new', () => {
  it('opens the editor on a blank report, loading the catalog once', async () => {
    loadNewReport.mockResolvedValue({ ok: true, data: { catalog: catalogFixture } });
    renderWithQuery(await NewReportPage({ searchParams: Promise.resolve({}) }));
    expect(loadNewReport).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Report name')).toHaveValue('');
    expect(screen.getByRole('radio', { name: 'KPI' })).toBeChecked();
  });

  it('reads ?template= on the server, so the first render is already prefilled', async () => {
    loadNewReport.mockResolvedValue({ ok: true, data: { catalog: catalogFixture } });
    renderWithQuery(await NewReportPage({ searchParams: Promise.resolve({ template: 'spend-vs-last-month-by-category' }) }));
    expect(screen.getByLabelText('Report name')).toHaveValue('Spend vs last month by category');
    expect(screen.getByRole('radio', { name: 'Chart' })).toBeChecked();
    expect(api.GET).not.toHaveBeenCalledWith('/api/v1/report/datasource');
  });

  it('starts a fresh draft when the template changes (the editor is keyed on it)', async () => {
    loadNewReport.mockResolvedValue({ ok: true, data: { catalog: catalogFixture } });
    const a = await NewReportPage({ searchParams: Promise.resolve({ template: 'dividend-income-by-fy' }) });
    const b = await NewReportPage({ searchParams: Promise.resolve({}) });
    expect((a as React.ReactElement).key).toBe('dividend-income-by-fy');
    expect((b as React.ReactElement).key).toBe('');
  });

  it('says what failed when the catalog does not load, inside the app bar', async () => {
    loadNewReport.mockResolvedValue({ ok: false, reference: 'req-9' });
    renderWithQuery(await NewReportPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Couldn't load reports")).toBeInTheDocument();
    expect(screen.getByText('Add report')).toBeInTheDocument();
  });
});

describe('/reports/[id]', () => {
  it('opens the saved report in its editor, already showing its result, with one server load and no browser fetch', async () => {
    loadSavedReport.mockResolvedValue({ ok: true, data: { catalog: catalogFixture, report: savedChart, initialResult: chart } });
    renderWithQuery(await ReportPage({ params: Promise.resolve({ id: 'r1' }) }));
    expect(loadSavedReport).toHaveBeenCalledTimes(1);
    expect(loadSavedReport).toHaveBeenCalledWith('r1');
    expect(screen.getByLabelText('Report name')).toHaveValue('Spend by category');
    expect(await screen.findByTestId('chart')).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
    expect(api.GET).not.toHaveBeenCalledWith('/api/v1/reports/{id}', expect.anything());
  });

  it('opens the editor with an empty preview when the run failed', async () => {
    loadSavedReport.mockResolvedValue({ ok: true, data: { catalog: catalogFixture, report: savedChart, initialResult: null } });
    renderWithQuery(await ReportPage({ params: Promise.resolve({ id: 'r1' }) }));
    expect(screen.getByLabelText('Report name')).toHaveValue('Spend by category');
    expect(screen.getByText('Click Preview to run this report.')).toBeInTheDocument();
  });

  it('shows the failure with its reference when the page does not load', async () => {
    loadSavedReport.mockResolvedValue({ ok: false, reference: 'req-9' });
    renderWithQuery(await ReportPage({ params: Promise.resolve({ id: 'r1' }) }));
    expect(screen.getByText("Couldn't load reports")).toBeInTheDocument();
  });
});
