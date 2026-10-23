import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { groups, holdingRow, holdingsResponse } from '@/features/investments/holdings/holdings.fixtures';
import type { TaxHarvestResponse } from '@/lib/taxHarvest.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import DsInvestmentsPage from './page';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
);
vi.mock('next/navigation', () => ({
  redirect,
  useRouter: () => router,
  usePathname: () => '/ds/investments',
  useSearchParams: () => new URLSearchParams(),
}));

const server = vi.hoisted(() => ({
  fetchHoldings: vi.fn(),
  fetchTaxHarvest: vi.fn(),
  fetchBrokers: vi.fn(),
  fetchLatestPriceJobId: vi.fn(),
}));
vi.mock('@/features/investments/investmentsServerApi', () => server);

const refresh = vi.hoisted(() => vi.fn());
const refreshOptions = vi.hoisted(() => ({ onSettled: undefined as undefined | (() => void) }));
const refreshState = vi.hoisted(() => ({ busy: false, jobId: null as string | null }));
vi.mock('@/features/investments/useRefreshPrices', () => ({
  useRefreshPrices: (options: { onSettled?: () => void }) => {
    refreshOptions.onSettled = options.onSettled;
    return { refresh, busy: refreshState.busy, jobId: refreshState.jobId };
  },
}));

const tax = {
  fy: 2026,
  realised: { ltcg: 2425, ltcl: 0, stcg: 0, stcl: 0, exemptionLeft: 122575 },
  summary: { harvestableLtcg: 98222, harvestableLosses: { total: 13500, longTerm: 0, shortTerm: 13500 } },
  openLots: {
    items: [
      { instrument: 'INFY', term: 'long', taxClass: 'EQUITY_ORIENTED', gain: 48162 },
      { instrument: 'TATAMOTORS', term: 'short', taxClass: 'EQUITY_ORIENTED', gain: -13500 },
    ],
  },
} as unknown as TaxHarvestResponse;

const rows = [
  holdingRow(),
  holdingRow({ instrumentId: 'i-hdfc', symbol: 'HDFC', name: 'HDFC Ltd', quantity: 0, mergedIntoName: 'HDFCBANK', mergedIntoDate: '2023-07-13', currentValue: 0 }),
  holdingRow({ instrumentId: 'i-nse', symbol: 'NSE', name: 'NSE unlisted', manualPrice: true, quantity: 10, ltp: 2150, currentValue: 21500, dayChange: null, dayChangePct: null }),
  holdingRow({ instrumentId: 'i-sintex', symbol: 'SINTEX', name: 'Sintex', noPrice: true, ltp: null, quantity: 100, avgCost: 45, currentValue: 4500, unrealised: 0, unrealisedPct: null, dayChange: null, dayChangePct: null }),
  holdingRow({ instrumentId: 'i-mirae', symbol: null, name: 'Mirae Asset Large Cap', assetType: 'mutual_fund', quantity: 325.11, ltp: 118.62, currentValue: 38564, dayChange: 40, dayChangePct: 0.1 }),
];

async function renderPage(params: Record<string, string> = {}) {
  const ui = await DsInvestmentsPage({ searchParams: Promise.resolve(params) });
  return renderWithQuery(ui);
}

beforeEach(() => {
  vi.clearAllMocks();
  refreshState.busy = false;
  refreshState.jobId = null;
  server.fetchHoldings.mockResolvedValue(holdingsResponse(rows));
  server.fetchTaxHarvest.mockResolvedValue(tax);
  server.fetchBrokers.mockResolvedValue([
    { id: 'b1', name: 'Zerodha Main' },
    { id: 'b2', name: 'Groww Demat' },
  ]);
  server.fetchLatestPriceJobId.mockResolvedValue('job-9');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('/ds/investments Holdings: data', () => {
  it('asks the server for the first page of holdings by name', async () => {
    await renderPage();
    expect(server.fetchHoldings).toHaveBeenCalledWith({
      search: undefined,
      assetType: undefined,
      brokerAccountId: undefined,
      sort: 'name',
      page: 0,
      size: 50,
    });
  });

  it('passes the search, type, broker, sort, page and size from the URL to the server', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse(rows, { totalElements: 120, totalPages: 3 }));
    await renderPage({ q: 'tcs', type: 'etf', broker: 'b2', sort: 'return_pct', page: '1', size: '25' });
    expect(server.fetchHoldings).toHaveBeenCalledWith({
      search: 'tcs',
      assetType: 'etf',
      brokerAccountId: 'b2',
      sort: 'return_pct',
      page: 1,
      size: 25,
    });
  });

  it('reads the first paint once: one holdings request when the list fits a page', async () => {
    await renderPage();
    expect(server.fetchHoldings).toHaveBeenCalledTimes(1);
  });

  it('looks wider for today\'s movers when the list has more pages', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse(rows, { totalElements: 120, totalPages: 3 }));
    await renderPage({ page: '1' });
    expect(server.fetchHoldings).toHaveBeenCalledTimes(2);
    expect(server.fetchHoldings).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, size: 200, sort: 'name' }));
  });
});

describe('/ds/investments Holdings: figures', () => {
  it('shows the phone hero and the desktop tiles from the header', async () => {
    await renderPage();
    expect(screen.getAllByText('₹6,38,208').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('+₹3,566 today · +0.6%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹4,93,299').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('+₹1,44,909').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('+29.4% · XIRR 24.1%').length).toBeGreaterThan(0);
    for (const label of ['Current value', 'Invested', 'Unrealised P&L', 'Realised this FY']) {
      expect(screen.getAllByText(label).length, label).toBeGreaterThan(0);
    }
  });

  it('says so under Realised this FY when the tax request fails, and still lists holdings', async () => {
    server.fetchTaxHarvest.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.getAllByText('Could not load this figure. Refresh the page to try again.')).toHaveLength(1);
    expect(screen.queryByText('Tax this FY')).toBeNull();
    expect(screen.getAllByText('HDFCBANK').length).toBeGreaterThan(0);
  });

  it('shows the Allocation, Tax this FY and Top movers cards', async () => {
    server.fetchHoldings.mockResolvedValue(
      holdingsResponse([holdingRow({ instrumentId: 'a', symbol: 'INFY', dayChange: 1860 }), holdingRow({ instrumentId: 'b', symbol: 'TCS', dayChange: -280 })]),
    );
    await renderPage();
    expect(screen.getByText('Allocation')).toBeInTheDocument();
    expect(screen.getAllByText('Stocks 63%').length).toBeGreaterThan(0);
    expect(screen.getByText('Tax this FY')).toBeInTheDocument();
    expect(screen.getByText('FY 26-27')).toBeInTheDocument();
    expect(screen.getByText('LTCG exemption left')).toBeInTheDocument();
    expect(screen.getByText('₹1,22,575')).toBeInTheDocument();
    // INFY is named in its row, under Harvestable gains and in Top movers.
    expect(screen.getAllByText('INFY')).toHaveLength(3);
    expect(screen.getByText('Loss to offset')).toBeInTheDocument();
    expect(screen.getByText('TATAMOTORS')).toBeInTheDocument();
    expect(screen.getByText('Top movers today')).toBeInTheDocument();
    expect(screen.getByText('+₹1,860')).toBeInTheDocument();
    expect(screen.getByText('−₹280')).toBeInTheDocument();
  });
});

describe('/ds/investments Holdings: prices line', () => {
  it('says when the prices are from and starts a refresh', async () => {
    await renderPage();
    expect(screen.getByText(/Prices as of 13 Oct/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('links View job to the exact latest job in Settings → Activity', async () => {
    await renderPage();
    expect(screen.getByRole('link', { name: 'View job' })).toHaveAttribute('href', '/ds/settings/activity?job=job-9');
  });

  it('links View job to the job this visit started, once there is one', async () => {
    refreshState.jobId = 'job-new';
    await renderPage();
    expect(screen.getByRole('link', { name: 'View job' })).toHaveAttribute('href', '/ds/settings/activity?job=job-new');
  });

  it('has no View job link when no price refresh ever ran', async () => {
    server.fetchLatestPriceJobId.mockResolvedValue(null);
    await renderPage();
    expect(screen.queryByRole('link', { name: 'View job' })).toBeNull();
  });

  it('still renders when the job lookup fails', async () => {
    server.fetchLatestPriceJobId.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.queryByRole('link', { name: 'View job' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });
});

describe('/ds/investments Holdings: rows', () => {
  it('groups holdings under their asset type with the group total', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse([rows[0], rows[4]]));
    await renderPage();
    expect(screen.getAllByText(/Stocks/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Mutual funds/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹4,01,290').length).toBeGreaterThan(0);
  });

  it('writes a priced row: quantity × price, the day move and the P&L', async () => {
    await renderPage();
    expect(screen.getAllByText(/40 × ₹1,742\.60/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('+₹6,504').length).toBeGreaterThan(0);
    expect(screen.getAllByText('−0.3%').length).toBeGreaterThan(0);
  });

  it('writes a merged holding with what it merged into and no P&L', async () => {
    await renderPage();
    expect(screen.getAllByText(/Merged into HDFCBANK · 13 Jul 23/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0 shares/).length).toBeGreaterThan(0);
  });

  it('says "manual price" for a holding priced by hand', async () => {
    await renderPage();
    expect(screen.getAllByText(/manual price/).length).toBeGreaterThan(0);
  });

  it('says "at cost (no price)" with a record-a-merger link for a holding without a price', async () => {
    await renderPage();
    expect(screen.getAllByText(/at cost \(no price\)/).length).toBeGreaterThan(0);
    const links = screen.getAllByRole('link', { name: 'record a merger' });
    expect(links.length).toBeGreaterThan(0);
    // The corporate-action record flow is not built in Dinero yet: the link goes to the Legacy page.
    expect(links[0]).toHaveAttribute('href', '/investments/corporate-actions');
  });

  it('writes a fund by its name with units', async () => {
    await renderPage();
    expect(screen.getAllByText('Mirae Asset Large Cap').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/325\.11 units × ₹118\.62/).length).toBeGreaterThan(0);
  });

  it('opens the holding page when the row is pressed, and has a link for it', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByText('HDFCBANK')[0]);
    expect(router.push).toHaveBeenCalledWith('/ds/investments/i-hdfcbank');
    expect(screen.getByRole('link', { name: 'Open HDFCBANK' })).toHaveAttribute('href', '/ds/investments/i-hdfcbank');
  });

  it('says nothing matches when the filters find no holding, and offers to clear them', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse([], { groups: [] }));
    await renderPage({ q: 'zzz' });
    expect(screen.getByText('No holdings match.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.push).toHaveBeenCalledWith('/ds/investments');
  });

  it('invites a first trade when there are no holdings at all', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse([], { groups: [] }));
    await renderPage();
    expect(screen.getByText('No holdings yet. Record a trade or import your tradebook.')).toBeInTheDocument();
  });

  it('shows an error with Try again when the holdings fail to load', async () => {
    server.fetchHoldings.mockRejectedValue(new Error('boom'));
    await renderPage();
    expect(screen.getByText('Could not load holdings')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(router.refresh).toHaveBeenCalled();
  });
});

describe('/ds/investments Holdings: filters go to the URL', () => {
  it('filters by type from the chips, back to the first page', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse(rows, { totalElements: 120, totalPages: 3 }));
    await renderPage({ page: '2' });
    fireEvent.click(screen.getByRole('button', { name: /^Funds/ }));
    expect(router.push).toHaveBeenCalledWith('/ds/investments?type=mutual_fund', { scroll: false });
  });

  it('selects the active type chip and shows each type\'s count', async () => {
    await renderPage({ type: 'stock' });
    expect(screen.getByRole('button', { name: /^Stocks/ })).toHaveTextContent('Stocks · 8');
    expect(screen.getByRole('button', { name: /^Funds/ })).toHaveTextContent('Funds · 3');
    expect(screen.getByRole('button', { name: /^Stocks/ }).className).not.toBe(screen.getByRole('button', { name: /^Funds/ }).className);
  });

  it('clears the type with All', async () => {
    await renderPage({ type: 'etf', q: 'gold' });
    fireEvent.click(screen.getByRole('button', { name: /^All/ }));
    expect(router.push).toHaveBeenCalledWith('/ds/investments?q=gold', { scroll: false });
  });

  it('searches the server once typing pauses, from the first page', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse(rows, { totalElements: 120, totalPages: 3 }));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await renderPage({ page: '2' });
    fireEvent.change(screen.getByPlaceholderText('Symbol or name'), { target: { value: 'infy' } });
    expect(router.push).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/ds/investments?q=infy', { scroll: false });
  });

  it('sorts by return from the sort dropdown, which starts on Name A–Z', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Name A–Z/ }));
    fireEvent.click(await screen.findByRole('option', { name: '% return' }));
    expect(router.push).toHaveBeenCalledWith('/ds/investments?sort=return_pct', { scroll: false });
  });

  it('filters by broker from the Broker dropdown', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Broker' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Groww Demat' }));
    expect(router.push).toHaveBeenCalledWith('/ds/investments?broker=b2', { scroll: false });
  });

  it('names the chosen broker on its chip', async () => {
    await renderPage({ broker: 'b1' });
    expect(screen.getByRole('button', { name: 'Zerodha Main' })).toBeInTheDocument();
  });

  it('leaves the Broker chip out when the accounts cannot be read', async () => {
    server.fetchBrokers.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.queryByRole('button', { name: 'Broker' })).toBeNull();
  });

  it('shows the Pager above and below with the server totals, and pages through the URL', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse(rows, { totalElements: 120, totalPages: 3 }));
    await renderPage({ type: 'stock' });
    expect(screen.getAllByText('/ 120').length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getAllByRole('button', { name: /next/i })[0]);
    expect(router.push).toHaveBeenCalledWith('/ds/investments?type=stock&page=1', { scroll: false });
  });
});

describe('/ds/investments Holdings: whole-portfolio figures', () => {
  const stockOnly = holdingsResponse(rows, { groups: [{ assetType: 'stock', value: 401290, count: 8 }] });
  const whole = holdingsResponse([], { groups, totalElements: 13 });

  it('reads the unfiltered groups too when a type filter is on, keeping the broker filter', async () => {
    server.fetchHoldings.mockImplementation(async (q: { assetType?: string }) => (q.assetType ? stockOnly : whole));
    await renderPage({ type: 'stock', broker: 'b2', q: 'inf' });
    expect(server.fetchHoldings).toHaveBeenCalledTimes(2);
    expect(server.fetchHoldings).toHaveBeenCalledWith(expect.objectContaining({ assetType: 'stock', brokerAccountId: 'b2', search: 'inf' }));
    expect(server.fetchHoldings).toHaveBeenCalledWith({ brokerAccountId: 'b2', sort: 'name', page: 0, size: 1 });
  });

  it('keeps every type\'s chip count and the full Allocation while one type is filtered', async () => {
    server.fetchHoldings.mockImplementation(async (q: { assetType?: string }) => (q.assetType ? stockOnly : whole));
    await renderPage({ type: 'stock' });
    expect(screen.getByRole('button', { name: /^Stocks/ })).toHaveTextContent('Stocks · 8');
    expect(screen.getByRole('button', { name: /^Funds/ })).toHaveTextContent('Funds · 3');
    expect(screen.getByRole('button', { name: /^ETFs/ })).toHaveTextContent('ETFs · 2');
    expect(screen.getAllByText('Stocks 63%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mutual funds 31%').length).toBeGreaterThan(0);
  });

  it('makes no extra request without a type filter', async () => {
    await renderPage();
    expect(server.fetchHoldings).toHaveBeenCalledTimes(1);
  });

  it('counts open holdings in the Invested tile, not merged-away rows', async () => {
    // Five rows come back (one merged away), the groups count 13 open holdings.
    await renderPage();
    expect(screen.getByText('13 holdings')).toBeInTheDocument();
  });
});

describe('/ds/investments Holdings: a page past the end', () => {
  it('sends the visitor to the last page', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse([], { totalElements: 120, totalPages: 3, page: 7 }));
    await expect(renderPage({ page: '7', type: 'stock' })).rejects.toThrow('REDIRECT /ds/investments?type=stock&page=2');
  });

  it('shows the empty state, not a redirect, when there are no holdings at all', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse([], { groups: [], totalElements: 0, totalPages: 0 }));
    await renderPage({ page: '2' });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('/ds/investments Holdings: refresh settles', () => {
  it('reloads the page data when the price job ends', async () => {
    await renderPage();
    expect(router.refresh).not.toHaveBeenCalled();
    act(() => refreshOptions.onSettled!());
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });
});
