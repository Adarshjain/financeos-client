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
  usePathname: () => '/investments',
  useSearchParams: () => new URLSearchParams(),
}));

const server = vi.hoisted(() => ({
  fetchHoldings: vi.fn(),
  fetchTaxHarvest: vi.fn(),
  fetchBrokers: vi.fn(),
}));
vi.mock('@/features/investments/investmentsServerApi', () => server);

// The record-a-merger dialog is tested on its own: here it only shows the props the list gives it.
vi.mock('@/features/investments/corporate-actions/CorporateActionDialog', async () => (await import('@/test/fakeDialog')).fakeDialog('action-dialog', 'CorporateActionDialog'));

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
  server.fetchHoldings.mockResolvedValue(holdingsResponse(rows));
  server.fetchTaxHarvest.mockResolvedValue(tax);
  server.fetchBrokers.mockResolvedValue([
    { id: 'b1', name: 'Zerodha Main' },
    { id: 'b2', name: 'Groww Demat' },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('/investments Holdings: data', () => {
  it('asks the server for the first page of holdings by name', async () => {
    await renderPage();
    expect(server.fetchHoldings).toHaveBeenCalledWith({
      search: undefined,
      assetType: undefined,
      brokerAccountId: undefined,
      sort: 'name',
      page: 0,
      size: 25,
    });
  });

  it('passes the search, type, broker, sort, page and size from the URL to the server', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse(rows, { totalElements: 120, totalPages: 3 }));
    await renderPage({ q: 'tcs', type: 'etf', broker: 'b2', sort: 'return_pct', page: '2', size: '25' });
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
    await renderPage({ page: '2' });
    expect(server.fetchHoldings).toHaveBeenCalledTimes(2);
    expect(server.fetchHoldings).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, size: 200, sort: 'name' }));
  });
});

describe('/investments Holdings: figures', () => {
  it('shows the hero from the header: value with today, then Invested and Unrealised P&L', async () => {
    await renderPage();
    expect(screen.getAllByText('₹6,38,208')).toHaveLength(1);
    expect(screen.getAllByText('+₹3,566 today · +0.56%')).toHaveLength(1);
    expect(screen.getAllByText('₹4,93,299')).toHaveLength(1);
    expect(screen.getAllByText('+₹1,44,909')).toHaveLength(1);
    expect(screen.getAllByText('+29.4% · XIRR 24.1%')).toHaveLength(1);
    for (const label of ['Current value', 'Invested', 'Unrealised P&L']) {
      expect(screen.getAllByText(label).length, label).toBeGreaterThan(0);
    }
    expect(screen.queryByText('Realised this FY')).toBeNull();
  });

  it('drops the Tax card when the tax request fails, and still lists holdings', async () => {
    server.fetchTaxHarvest.mockRejectedValue(new Error('down'));
    await renderPage();
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

describe('/investments Holdings: prices line', () => {
  it('says when the prices are from, with no refresh button or job link', async () => {
    await renderPage();
    expect(screen.getByText(/Prices as of 13 Oct/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Refresh/ })).toBeNull();
    expect(screen.queryByRole('link', { name: 'View job' })).toBeNull();
  });
});

describe('/investments Holdings: rows', () => {
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

  it('says "at cost (no price)" with a record-a-merger button that opens the corporate-action dialog for that holding', async () => {
    await renderPage();
    expect(screen.getAllByText(/at cost \(no price\)/).length).toBeGreaterThan(0);
    const buttons = screen.getAllByRole('button', { name: 'record a merger' });
    expect(buttons.length).toBeGreaterThan(0);
    expect(screen.queryByTestId('action-dialog')).toBeNull();
    fireEvent.click(buttons[0]);
    expect(JSON.parse(screen.getByTestId('action-dialog').textContent ?? '{}')).toEqual({
      instrument: { id: 'i-sintex', name: 'Sintex', symbol: 'SINTEX' },
      type: 'merger',
    });
    // The row itself was not opened.
    expect(router.push).not.toHaveBeenCalled();
  });

  it('writes a fund by its name with units', async () => {
    await renderPage();
    expect(screen.getAllByText('Mirae Asset Large Cap').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/325\.11 units × ₹118\.62/).length).toBeGreaterThan(0);
  });

  it('opens the holding page when the row is pressed, with no chevron link at the row end', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByText('HDFCBANK')[0]);
    expect(router.push).toHaveBeenCalledWith('/investments/i-hdfcbank');
    expect(screen.queryByRole('link', { name: 'Open HDFCBANK' })).toBeNull();
  });

  it('says nothing matches when the filters find no holding, and offers to clear them', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse([], { groups: [] }));
    await renderPage({ q: 'zzz' });
    expect(screen.getByText('No holdings match')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clear filters' })).toHaveAttribute('href', '/investments');
  });

  it('invites a first trade when there are no holdings at all', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse([], { groups: [] }));
    await renderPage();
    expect(screen.getByText('No holdings yet')).toBeInTheDocument();
    expect(screen.getByText('Record a trade or import your tradebook.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Import tradebook' })).toBeInTheDocument();
  });

  it('shows an error with Retry when the holdings fail to load', async () => {
    server.fetchHoldings.mockRejectedValue(new Error('boom'));
    await renderPage();
    expect(screen.getByText("Couldn't load holdings")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(router.refresh).toHaveBeenCalled();
  });
});

describe('/investments Holdings: filters go to the URL', () => {
  it('filters by type from the Asset type dropdown, back to the first page', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse(rows, { totalElements: 120, totalPages: 3 }));
    await renderPage({ page: '3' });
    fireEvent.click(screen.getByRole('button', { name: 'Asset type' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Mutual funds' }));
    expect(router.push).toHaveBeenCalledWith('/investments?type=mutual_fund', { scroll: false });
  });

  it('offers All types, Stocks, Mutual funds and ETFs, and names the chosen type on its chip', async () => {
    await renderPage({ type: 'stock' });
    expect(screen.queryByRole('button', { name: /^Funds/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Stocks' }));
    const names = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(names).toEqual(['All types', 'Stocks', 'Mutual funds', 'ETFs']);
  });

  it('clears the type with All types', async () => {
    await renderPage({ type: 'etf', q: 'gold' });
    fireEvent.click(screen.getByRole('button', { name: 'ETFs' }));
    fireEvent.click(await screen.findByRole('option', { name: 'All types' }));
    expect(router.push).toHaveBeenCalledWith('/investments?q=gold', { scroll: false });
  });

  it('resets a changed type with the x of its chip, and every filter with Reset filters at the row end', async () => {
    await renderPage({ type: 'etf', q: 'gold' });
    fireEvent.click(screen.getByRole('button', { name: 'Reset filter' }));
    expect(router.push).toHaveBeenLastCalledWith('/investments?q=gold', { scroll: false });
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(router.push).toHaveBeenLastCalledWith('/investments', { scroll: false });
  });

  it('shows no Reset filters while every filter is on its default', async () => {
    await renderPage();
    expect(screen.queryByRole('button', { name: 'Reset filters' })).toBeNull();
  });

  it('searches the server once typing pauses, from the first page', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse(rows, { totalElements: 120, totalPages: 3 }));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await renderPage({ page: '3' });
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'infy' } });
    expect(router.push).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/investments?q=infy', { scroll: false });
  });

  it('sorts by return from the sort dropdown, which starts on Name A–Z', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Name A–Z/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'Best % return' }));
    expect(router.push).toHaveBeenCalledWith('/investments?sort=return_pct', { scroll: false });
  });

  it('lists every sort with its direction and puts sort and dir in the address', async () => {
    const cases: [string, string][] = [
      ['Name Z–A', '/investments?dir=desc'],
      ['Worst % return', '/investments?sort=return_pct&dir=asc'],
      ['Best ₹ return', '/investments?sort=return_abs'],
      ['Worst ₹ return', '/investments?sort=return_abs&dir=asc'],
    ];
    for (const [label, url] of cases) {
      router.push.mockClear();
      const { unmount } = await renderPage();
      fireEvent.click(screen.getByRole('button', { name: /Name A–Z/ }));
      fireEvent.click(await screen.findByRole('option', { name: label }));
      expect(router.push, label).toHaveBeenCalledWith(url, { scroll: false });
      unmount();
    }
  });

  it('shows the chosen direction on the sort chip and asks the server for it', async () => {
    await renderPage({ sort: 'return_abs', dir: 'asc' });
    expect(screen.getByRole('button', { name: 'Worst ₹ return' })).toBeInTheDocument();
    expect(server.fetchHoldings).toHaveBeenCalledWith(expect.objectContaining({ sort: 'return_abs', dir: 'asc' }));
  });

  it('sends no dir for a key default and keeps the movers scan and whole-portfolio reads on name order', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse(rows, { totalElements: 120, totalPages: 3 }));
    await renderPage({ sort: 'name', dir: 'desc', type: 'stock' });
    const calls = server.fetchHoldings.mock.calls.map((c) => c[0]);
    expect(calls[0]).toMatchObject({ sort: 'name', dir: 'desc' });
    for (const c of calls.slice(1)) expect(c.dir).toBeUndefined();
  });

  it('filters by broker from the Broker dropdown', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Broker' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Groww Demat' }));
    expect(router.push).toHaveBeenCalledWith('/investments?broker=b2', { scroll: false });
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
    expect(router.push).toHaveBeenCalledWith('/investments?type=stock&page=2', { scroll: false });
  });
});

describe('/investments Holdings: whole-portfolio figures', () => {
  const stockOnly = holdingsResponse(rows, { groups: [{ assetType: 'stock', value: 401290, count: 8 }] });
  const whole = holdingsResponse([], { groups, totalElements: 13 });

  it('reads the unfiltered groups too when a type filter is on, keeping the broker filter', async () => {
    server.fetchHoldings.mockImplementation(async (q: { assetType?: string }) => (q.assetType ? stockOnly : whole));
    await renderPage({ type: 'stock', broker: 'b2', q: 'inf' });
    expect(server.fetchHoldings).toHaveBeenCalledTimes(2);
    expect(server.fetchHoldings).toHaveBeenCalledWith(expect.objectContaining({ assetType: 'stock', brokerAccountId: 'b2', search: 'inf' }));
    expect(server.fetchHoldings).toHaveBeenCalledWith({ brokerAccountId: 'b2', sort: 'name', page: 0, size: 1 });
  });

  it('keeps the full Allocation while one type is filtered', async () => {
    server.fetchHoldings.mockImplementation(async (q: { assetType?: string }) => (q.assetType ? stockOnly : whole));
    await renderPage({ type: 'stock' });
    expect(screen.getAllByText('Stocks 63%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mutual funds 31%').length).toBeGreaterThan(0);
  });

  it('makes no extra request without a type filter', async () => {
    await renderPage();
    expect(server.fetchHoldings).toHaveBeenCalledTimes(1);
  });
});

describe('/investments Holdings: a page past the end', () => {
  it('sends the visitor to the last page', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse([], { totalElements: 120, totalPages: 3, page: 7 }));
    await expect(renderPage({ page: '8', type: 'stock' })).rejects.toThrow('REDIRECT /investments?type=stock&page=3');
  });

  it('shows the empty state, not a redirect, when there are no holdings at all', async () => {
    server.fetchHoldings.mockResolvedValue(holdingsResponse([], { groups: [], totalElements: 0, totalPages: 0 }));
    await renderPage({ page: '3' });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('/investments Holdings: filter row', () => {
  it('is a FilterBar: search first with the default placeholder, then the chips, carrying their own bleed', async () => {
    await renderPage();
    const row = screen.getByPlaceholderText('Search').closest('div.overflow-x-auto') as HTMLElement;
    expect(row).toHaveClass('scrollbar-none', '-mx-space-16', 'px-space-16', 'py-space-4');
    expect(row.querySelectorAll('button').length).toBeGreaterThan(0);
    expect(row.querySelector('input')).toBe(screen.getByPlaceholderText('Search'));
  });
});
