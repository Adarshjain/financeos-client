import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { brokers, fnoPage, summary } from '@/features/investments/fno/fno.fixtures';
import { FNO_HREF } from '@/features/investments/fno/fnoModel';
import { renderWithQuery } from '@/test/renderWithQuery';

import DsFnoPage from './page';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ redirect: vi.fn(), useRouter: () => router, usePathname: () => '/ds/investments/fno' }));
vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));
const server = vi.hoisted(() => ({ fetchFnoPage: vi.fn(), fetchFnoSummary: vi.fn(), fetchFnoCsv: vi.fn() }));
vi.mock('@/features/investments/fno/fnoServerApi', () => server);
const shared = vi.hoisted(() => ({ fetchBrokers: vi.fn() }));
vi.mock('@/features/investments/investmentsServerApi', () => shared);
vi.mock('@/features/investments/fno/fnoActions', () => ({ exportFnoCsv: vi.fn() }));

async function renderPage(params: Record<string, string> = {}) {
  const ui = await DsFnoPage({ searchParams: Promise.resolve(params) });
  return renderWithQuery(ui);
}

beforeEach(() => {
  vi.clearAllMocks();
  server.fetchFnoPage.mockResolvedValue(fnoPage());
  server.fetchFnoSummary.mockResolvedValue({ ...summary, byMonth: [] });
  shared.fetchBrokers.mockResolvedValue(brokers);
});

describe('/ds/investments/fno: All years', () => {
  it('requests the page without a year and the summary for all years', async () => {
    await renderPage({ fy: 'all' });
    expect(server.fetchFnoPage.mock.calls[0][0].fy).toBeUndefined();
    expect(server.fetchFnoSummary).toHaveBeenCalledWith({ allYears: true, brokerAccountId: undefined });
    expect(server.fetchFnoPage).toHaveBeenCalledTimes(1);
  });

  it('hides the month cards and the export, keeps the underlying card and the realised line', async () => {
    await renderPage({ fy: 'all' });
    expect(screen.queryByText('P&L by month')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Export for ITR' })).toBeNull();
    expect(screen.getByText('By underlying')).toBeInTheDocument();
    expect(screen.getByText(/taxed as business income/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All years/ })).toBeInTheDocument();
  });

  it('hides the month cards even when the server sent months', async () => {
    server.fetchFnoSummary.mockResolvedValue(summary);
    await renderPage({ fy: 'all' });
    expect(screen.queryByText('P&L by month')).toBeNull();
  });

  it('labels the realised figure "all years" instead of FY, and keeps FY for one year', async () => {
    const { unmount } = await renderPage({ fy: 'all' });
    expect(screen.getAllByText('Realised · all years').length).toBeGreaterThan(0);
    expect(screen.queryByText('Realised · FY')).toBeNull();
    unmount();
    await renderPage();
    expect(screen.getAllByText('Realised · FY').length).toBeGreaterThan(0);
    expect(screen.queryByText('Realised · all years')).toBeNull();
  });

  it('picking All years puts fy=all in the address', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /FY 26-27/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'All years' }));
    expect(router.push).toHaveBeenLastCalledWith(`${FNO_HREF}?fy=all`, { scroll: false });
  });

  it('picking the current year from All years drops fy from the address', async () => {
    await renderPage({ fy: 'all' });
    fireEvent.click(screen.getByRole('button', { name: /All years/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'FY 26-27' }));
    expect(router.push).toHaveBeenLastCalledWith(FNO_HREF, { scroll: false });
  });

  it('says there are no trades without naming a year', async () => {
    server.fetchFnoPage.mockResolvedValue(fnoPage([]));
    await renderPage({ fy: 'all' });
    expect(screen.getByText(/^No F&O trades\. Log a trade/)).toBeInTheDocument();
  });
});
