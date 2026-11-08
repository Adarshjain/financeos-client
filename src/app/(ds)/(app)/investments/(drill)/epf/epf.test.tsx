import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { employer, entry, interest, manualContribution, settled, summary, transferred } from '@/features/investments/epf/epf.fixtures';
import { renderWithQuery } from '@/test/renderWithQuery';

import DsEpfPage from './page';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
);
vi.mock('next/navigation', () => ({ redirect, useRouter: () => router, usePathname: () => '/investments/epf' }));
vi.mock('@/lib/date-range', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/date-range')>()), todayInAppZone: () => '2026-10-27' }));
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: [] }) }));
vi.mock('@/features/transactions/TransactionPickerField', () => ({ TransactionPickerField: () => <div /> }));

const server = vi.hoisted(() => ({ fetchEpfSummary: vi.fn(), fetchEpfEmployers: vi.fn(), fetchEpfFys: vi.fn(), fetchEpfEntries: vi.fn() }));
vi.mock('@/features/investments/epf/epfServerApi', () => server);
vi.mock('@/features/investments/epf/epfActions', () => ({ loadEpfFormOptions: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api/client')>()), api: {} }));

const entries = [entry(), manualContribution(), interest()];
const page = (content = entries, extra: Record<string, unknown> = {}) => ({ content, totalElements: content.length, totalPages: 1, ...extra });

async function renderPage(params: Record<string, string> = {}) {
  const ui = await DsEpfPage({ searchParams: Promise.resolve(params) });
  return renderWithQuery(ui);
}

beforeEach(() => {
  vi.clearAllMocks();
  server.fetchEpfSummary.mockResolvedValue(summary());
  server.fetchEpfEmployers.mockResolvedValue([employer()]);
  server.fetchEpfFys.mockResolvedValue([2026, 2025]);
  server.fetchEpfEntries.mockResolvedValue(page());
});

describe('/investments/epf: data', () => {
  it('asks for the current employer and the newest FY with entries, one request each', async () => {
    await renderPage();
    expect(server.fetchEpfSummary).toHaveBeenCalledTimes(1);
    expect(server.fetchEpfEmployers).toHaveBeenCalledTimes(1);
    expect(server.fetchEpfFys).toHaveBeenCalledWith('e1');
    expect(server.fetchEpfEntries).toHaveBeenCalledWith({ employerId: 'e1', fy: 2026, page: 0, size: 25 });
    expect(server.fetchEpfEntries).toHaveBeenCalledTimes(1);
  });

  it('reads the FY, employer, page and size from the address before the first fetch', async () => {
    server.fetchEpfEmployers.mockResolvedValue([employer(), transferred()]);
    server.fetchEpfEntries.mockResolvedValue(page(entries, { totalElements: 60, totalPages: 2 }));
    await renderPage({ fy: '2025', employer: 'e2', page: '2', size: '50' });
    expect(server.fetchEpfFys).toHaveBeenCalledWith('e2');
    expect(server.fetchEpfEntries).toHaveBeenCalledWith({ employerId: 'e2', fy: 2025, page: 1, size: 50 });
  });

  it('asks for every employer and every year when the address says so', async () => {
    server.fetchEpfEmployers.mockResolvedValue([employer(), transferred()]);
    await renderPage({ fy: 'all', employer: 'all' });
    expect(server.fetchEpfFys).toHaveBeenCalledWith(undefined);
    expect(server.fetchEpfEntries).toHaveBeenCalledWith({ employerId: undefined, fy: undefined, page: 0, size: 25 });
  });

  it('draws the figures, the passbook, the employers and the pension', async () => {
    server.fetchEpfEmployers.mockResolvedValue([employer(), transferred(), settled()]);
    await renderPage();
    expect(screen.getAllByText('₹8,43,210').length).toBeGreaterThan(0);
    expect(screen.getByText('Passbook up to September 2026')).toBeInTheDocument();
    expect(screen.getByText('Northwind Labs · member ID …67890 · UAN …4321')).toBeInTheDocument();
    expect(screen.getAllByText('Interest · FY 25-26').length).toBeGreaterThan(0);
    expect(screen.getByText('Contoso Systems')).toBeInTheDocument();
    expect(screen.getByText('Pension (EPS)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'FY 26-27' })).toBeInTheDocument();
  });

  it('shows the stale banner with the months missing', async () => {
    server.fetchEpfSummary.mockResolvedValue(summary({ staleThrough: '2026-07-01' }));
    await renderPage();
    expect(screen.getByText('Your passbook is up to July 2026. Upload a newer one to bring in Aug and Sep.')).toBeInTheDocument();
  });

  it('shows the empty state when there is no EPF data', async () => {
    server.fetchEpfSummary.mockResolvedValue(summary({ hasData: false }));
    server.fetchEpfEmployers.mockResolvedValue([]);
    server.fetchEpfFys.mockResolvedValue([]);
    server.fetchEpfEntries.mockResolvedValue(page([]));
    await renderPage();
    expect(screen.getByText('No EPF yet')).toBeInTheDocument();
  });

  it('shows a load error with the reference when the list fails', async () => {
    server.fetchEpfEntries.mockRejectedValue(new Error('boom'));
    await renderPage();
    expect(screen.getByText("Couldn't load EPF")).toBeInTheDocument();
  });

  it('shows a load error when the summary fails', async () => {
    server.fetchEpfSummary.mockRejectedValue(new Error('boom'));
    await renderPage();
    expect(screen.getByText("Couldn't load EPF")).toBeInTheDocument();
  });

  it('sends a page past the end to the last page', async () => {
    server.fetchEpfEntries.mockResolvedValue(page(entries, { totalElements: 60, totalPages: 3 }));
    await expect(renderPage({ page: '8' })).rejects.toThrow('REDIRECT /investments/epf?page=3');
  });
});
