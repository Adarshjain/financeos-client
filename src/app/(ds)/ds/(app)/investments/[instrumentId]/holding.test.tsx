import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buy, pageData, prices } from '@/features/investments/holding/holding.fixtures';
import { renderWithQuery } from '@/test/renderWithQuery';

import DsHoldingPage from './page';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
);
vi.mock('next/navigation', () => ({
  redirect,
  useRouter: () => router,
  usePathname: () => '/ds/investments/i-infy',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const server = vi.hoisted(() => ({
  fetchHolding: vi.fn(),
  fetchInstrument: vi.fn(),
  fetchSellEstimate: vi.fn(),
  fetchInstrumentTrades: vi.fn(),
  fetchInstrumentDividends: vi.fn(),
  fetchInstrumentCorporateActions: vi.fn(),
  fetchPricesPage: vi.fn(),
  fetchPriceHistory: vi.fn(),
}));
vi.mock('@/features/investments/investmentsServerApi', () => server);

vi.mock('@/components/reports/views/ChartView', () => ({
  ChartView: ({ data }: { data: { categories: string[]; series: { data: number[] }[] } }) => (
    <div data-testid="chart">{`${data.categories.join(',')}|${data.series[0].data.join(',')}`}</div>
  ),
}));

const api = vi.hoisted(() => ({ POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

const data = pageData();

async function renderPage(query: { tab?: string; page?: string } = {}) {
  const ui = await DsHoldingPage({
    params: Promise.resolve({ instrumentId: 'i-infy' }),
    searchParams: Promise.resolve(query),
  });
  return renderWithQuery(ui);
}

beforeEach(() => {
  vi.clearAllMocks();
  server.fetchHolding.mockResolvedValue(data.holding);
  server.fetchInstrument.mockResolvedValue(data.instrument);
  server.fetchSellEstimate.mockResolvedValue(data.estimate);
  server.fetchInstrumentTrades.mockResolvedValue(data.trades);
  server.fetchInstrumentDividends.mockResolvedValue(data.dividends);
  server.fetchInstrumentCorporateActions.mockResolvedValue(data.corporateActions);
  server.fetchPricesPage.mockResolvedValue(data.prices);
  server.fetchPriceHistory.mockResolvedValue(data.history);
  api.POST.mockResolvedValue({ data: {} });
  api.PUT.mockResolvedValue({ data: {} });
  api.DELETE.mockResolvedValue({});
});

describe('/ds/investments/[instrumentId]: data', () => {
  it('reads Overview with the newest few of each section, once', async () => {
    await renderPage();
    expect(server.fetchHolding).toHaveBeenCalledWith('i-infy');
    expect(server.fetchSellEstimate).toHaveBeenCalledWith('i-infy');
    expect(server.fetchInstrumentTrades).toHaveBeenCalledWith('i-infy', 0, 10);
    expect(server.fetchInstrumentDividends).toHaveBeenCalledWith('i-infy', 0, 5);
    expect(server.fetchPricesPage).toHaveBeenCalledWith('i-infy', 0, 10);
  });

  it("reads a tab's own list a page at a time and only the count of the others", async () => {
    server.fetchInstrumentTrades.mockResolvedValue({ ...data.trades, number: 2, totalElements: 60, totalPages: 3 });
    await renderPage({ tab: 'trades', page: '2' });
    expect(server.fetchInstrumentTrades).toHaveBeenCalledWith('i-infy', 2, 25);
    expect(server.fetchInstrumentDividends).toHaveBeenCalledWith('i-infy', 0, 1);
    expect(server.fetchPricesPage).toHaveBeenCalledWith('i-infy', 0, 1);
  });

  it('is a 404 for a holding the user has never held', async () => {
    server.fetchHolding.mockRejectedValue(Object.assign(new Error('nf'), { name: 'ApiError', status: 404 }));
    await expect(renderPage()).rejects.toBeTruthy();
  });

  it('still shows the holding when a section fails', async () => {
    server.fetchInstrumentDividends.mockRejectedValue(new Error('down'));
    server.fetchSellEstimate.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.getAllByText('₹90,762').length).toBeGreaterThan(0);
    expect(screen.queryByText('If you sell today')).toBeNull();
    expect(screen.getByText('No dividends recorded for this holding.')).toBeInTheDocument();
  });
});

describe('/ds/investments/[instrumentId]: Overview', () => {
  it('shows the title, the particulars and the current value with its move', async () => {
    await renderPage();
    expect(screen.getAllByText('INFY · Infosys').length).toBeGreaterThan(0);
    expect(screen.getByText('Stock')).toBeInTheDocument();
    expect(screen.getByText('NSE · INE009A01021 · 2 brokers · long term')).toBeInTheDocument();
    expect(screen.getAllByText('+₹48,162 · +113.1% · today +2.1%').length).toBeGreaterThan(0);
  });

  it('shows the eight figures on the phone and as tiles on the desktop', async () => {
    await renderPage();
    for (const label of ['Quantity', 'Avg cost', 'LTP', 'XIRR', 'Invested', '₹ return', 'Realised P&L', 'Total charges']) {
      expect(screen.getAllByText(label), label).toHaveLength(2);
    }
    expect(screen.getAllByText('₹1,512.70').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('31.4%')).toHaveLength(2);
    expect(screen.getAllByText('₹51.20')).toHaveLength(2);
    expect(screen.getAllByText('across 2 trades')).toHaveLength(2);
  });

  it('lists the tabs as links with their counts and no count on Overview or Prices', async () => {
    await renderPage();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Overview', 'Trades · 2', 'Dividends · 1', 'Corporate actions · 1', 'Prices']);
    expect(screen.getByRole('tab', { name: /^Trades/ }).closest('a') ?? screen.getByRole('link', { name: /^Trades/ })).toHaveAttribute(
      'href',
      '/ds/investments/i-infy?tab=trades',
    );
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('data-state', 'active');
  });

  it('shows Trades with their broker, side and value, and the lots line', async () => {
    await renderPage();
    expect(screen.getByText('3 lots · FIFO')).toBeInTheDocument();
    expect(screen.getAllByText('Buy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Zerodha').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹28,400').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Record trade' })).toHaveAttribute('href', '/investments/tradebook');
  });

  it('shows By broker with each broker\'s shares, average cost and value', async () => {
    await renderPage();
    expect(screen.getByText('Zerodha · ZQ4471')).toBeInTheDocument();
    expect(screen.getByText('40 shares · avg ₹710.00')).toBeInTheDocument();
    expect(screen.getByText('₹60,508')).toBeInTheDocument();
    expect(screen.getByText('Groww · GR88213')).toBeInTheDocument();
  });

  it('shows one "Sell all" row with the estimate, and no partial sale row', async () => {
    await renderPage();
    expect(screen.getByText('If you sell today')).toBeInTheDocument();
    expect(screen.getByText('Estimates · FY 26-27')).toBeInTheDocument();
    expect(screen.getByText('Sell all 60')).toBeInTheDocument();
    expect(screen.getByText('Gain ₹48,162 · long term · tax ≈ ₹0 · ₹1,06,521 exemption left')).toBeInTheDocument();
    expect(screen.queryByText(/^Sell 20/)).toBeNull();
  });

  it('shows Dividends without a Final or Interim word, and Corporate actions without "Applied"', async () => {
    await renderPage();
    expect(screen.getByText('Dividend ₹22 / share')).toBeInTheDocument();
    expect(screen.getByText('ex 30 May 25 · paid 18 Jun 25 · TDS ₹132')).toBeInTheDocument();
    expect(screen.getByText('+₹1,320')).toBeInTheDocument();
    expect(screen.getByText('Bonus 1:1')).toBeInTheDocument();
    expect(screen.getByText('ex 10 Jun 25')).toBeInTheDocument();
    expect(screen.queryByText(/Final|Interim|Applied/)).toBeNull();
    expect(screen.getAllByRole('link', { name: 'Record' }).map((a) => a.getAttribute('href'))).toEqual([
      '/investments/dividends',
      '/investments/corporate-actions',
    ]);
  });

  it('shows the Instrument card with an Edit link to the Legacy instruments page', async () => {
    await renderPage();
    for (const text of ['Shared catalog entry', 'INE009A01021', 'INFY.NS', 'Yahoo', 'none']) {
      expect(screen.getAllByText(text).length, text).toBeGreaterThan(0);
    }
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/investments/instruments');
  });
});

describe('/ds/investments/[instrumentId]: Price chart', () => {
  it('draws the daily close over one year to start with, oldest first', async () => {
    await renderPage();
    expect(screen.getByText('Price · 1 year')).toBeInTheDocument();
    expect(screen.getByText('Daily close')).toBeInTheDocument();
    expect(screen.getByTestId('chart')).toHaveTextContent('1 Aug 26,20 Sep 26,13 Oct 26|1400,1450,1512.7');
  });

  it('narrows the range from the 1m / 3m / 1y / All control', async () => {
    await renderPage();
    for (const label of ['1m', '3m', '1y', 'All']) expect(screen.getByRole('radio', { name: label })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: '1m' }));
    expect(screen.getByText('Price · 1 month')).toBeInTheDocument();
    // Counted back from the newest price: 20 Sep and 13 Oct are within a month.
    expect(screen.getByTestId('chart')).toHaveTextContent('20 Sep 26,13 Oct 26|1450,1512.7');
    fireEvent.click(screen.getByRole('radio', { name: '3m' }));
    expect(screen.getByTestId('chart')).toHaveTextContent('1 Aug 26,20 Sep 26,13 Oct 26|1400,1450,1512.7');
    fireEvent.click(screen.getByRole('radio', { name: 'All' }));
    expect(screen.getByText('Price · All time')).toBeInTheDocument();
  });

  it('says there are too few prices to draw', async () => {
    server.fetchPriceHistory.mockResolvedValue(data.history!.slice(0, 1));
    await renderPage();
    expect(screen.getByText('Not enough prices to draw a chart yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('chart')).toBeNull();
  });

  it('leaves the chart out when the history cannot be read, and on the other tabs', async () => {
    server.fetchPriceHistory.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.queryByText(/^Price · /)).toBeNull();
    server.fetchPriceHistory.mockClear();
    await renderPage({ tab: 'trades' });
    expect(server.fetchPriceHistory).not.toHaveBeenCalled();
  });
});

describe('/ds/investments/[instrumentId]: Price history', () => {
  it('lists the newest prices with their source', async () => {
    await renderPage();
    expect(screen.getByText('Price history')).toBeInTheDocument();
    expect(screen.getByText('13 Oct 26')).toBeInTheDocument();
    expect(screen.getAllByText('Yahoo').length).toBeGreaterThan(0);
    expect(screen.getByText('manual price')).toBeInTheDocument();
    expect(screen.getByText('₹1,470.00')).toBeInTheDocument();
  });

  it('puts Edit and Delete only on the user\'s own manual price', async () => {
    await renderPage();
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1);
  });

  it('shows no Edit or Delete when every price is from a feed', async () => {
    server.fetchPricesPage.mockResolvedValue({ ...data.prices, items: prices.filter((p) => !p.editable) });
    await renderPage();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('edits the amount of a manual price: the date is shown and cannot change', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: /Edit manual price/ });
    expect(within(dialog).getByDisplayValue('10/10/2026')).toBeDisabled();
    const amount = within(dialog).getByLabelText('Price');
    expect(amount).toHaveValue('1470');
    fireEvent.change(amount, { target: { value: '1475.5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save price' }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
      params: { path: { instrumentId: 'i-infy', priceId: 'p3' } },
      body: { price: 1475.5 },
    });
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Price updated');
  });

  it('refuses a price that is not above zero', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: /Edit manual price/ });
    fireEvent.change(within(dialog).getByLabelText('Price'), { target: { value: '0' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save price' }));
    expect(await within(dialog).findByText('Enter a price above zero.')).toBeInTheDocument();
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('confirms before deleting, says what goes and what stays, then deletes', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete manual price' });
    expect(within(dialog).getByText('Delete your manual price of ₹1,470.00 on 10 Oct 26?')).toBeInTheDocument();
    expect(within(dialog).getByText('Only this price is deleted.')).toBeInTheDocument();
    expect(within(dialog).getByText('Your trades and the other prices stay.')).toBeInTheDocument();
    expect(api.DELETE).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete price' }));
    await waitFor(() => expect(api.DELETE).toHaveBeenCalled());
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
      params: { path: { instrumentId: 'i-infy', priceId: 'p3' } },
    });
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Price entry deleted'));
    expect(router.refresh).toHaveBeenCalled();
  });

  it('keeps the price and says so when the delete fails', async () => {
    api.DELETE.mockRejectedValue(new Error('Could not delete'));
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete manual price' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete price' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Failed to delete the price', { tone: 'danger' }));
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('sets a manual price from the LTP "override" link, dated today', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'override' })[0]);
    const dialog = await screen.findByRole('dialog', { name: /Set manual price/ });
    const date = within(dialog).getByDisplayValue('13/10/2026');
    expect(date).not.toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Price'), { target: { value: '1600' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save price' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/instruments/{id}/price', {
      params: { path: { id: 'i-infy' } },
      body: { price: 1600, asOf: '2026-10-13' },
    });
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Price updated for Infosys'));
  });
});

describe('/ds/investments/[instrumentId]: tabs', () => {
  it("shows only that section on a tab, with its own Pager above and below", async () => {
    server.fetchInstrumentTrades.mockResolvedValue({ ...data.trades, totalElements: 60, totalPages: 3, size: 25 });
    await renderPage({ tab: 'trades' });
    expect(screen.getByRole('tab', { name: /^Trades/ })).toHaveAttribute('data-state', 'active');
    expect(screen.queryByText('Price history')).toBeNull();
    expect(screen.queryByText('By broker')).toBeNull();
    expect(screen.getAllByText('/ 60').length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getAllByRole('button', { name: /next/i })[0]);
    expect(router.push).toHaveBeenCalledWith('/ds/investments/i-infy?tab=trades&page=1', { scroll: false });
  });

  it('pages the Prices tab, which keeps Edit and Delete', async () => {
    server.fetchPricesPage.mockResolvedValue({ ...data.prices, totalElements: 40, totalPages: 4, size: 10 });
    await renderPage({ tab: 'prices' });
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /next/i })[0]);
    expect(router.push).toHaveBeenCalledWith('/ds/investments/i-infy?tab=prices&page=1', { scroll: false });
  });

  it('shows the Dividends tab and the Corporate actions tab on their own', async () => {
    await renderPage({ tab: 'dividends' });
    expect(screen.getByText('Dividend ₹22 / share')).toBeInTheDocument();
    expect(screen.queryByText('Bonus 1:1')).toBeNull();
  });

  it('shows the Corporate actions tab on its own', async () => {
    await renderPage({ tab: 'corporate-actions' });
    expect(screen.getByText('Bonus 1:1')).toBeInTheDocument();
    expect(screen.queryByText('Dividend ₹22 / share')).toBeNull();
  });
});

describe('/ds/investments/[instrumentId]: trades table figures', () => {
  it('has plain figures on desktop and ₹ on phone: no ₹ in the Price column or the P&L caption', async () => {
    server.fetchInstrumentTrades.mockResolvedValue({
      ...data.trades,
      content: [buy({ id: 's1', type: 'sell', quantity: 10, price: 1500, realisedPnl: 800 })],
    });
    await renderPage();
    expect(screen.getByText('1,500.00')).toBeInTheDocument();
    expect(screen.getByText('15,000')).toBeInTheDocument();
    expect(screen.getByText('₹15,000')).toBeInTheDocument();
    expect(screen.getByText('P&L +800')).toBeInTheDocument();
  });
});

describe('/ds/investments/[instrumentId]: a page past the end', () => {
  it('sends a Prices tab page past the end to the last page', async () => {
    server.fetchPricesPage.mockResolvedValue({ ...data.prices, items: [], page: 5, totalElements: 20, totalPages: 2 });
    await expect(renderPage({ tab: 'prices', page: '5' })).rejects.toThrow('REDIRECT /ds/investments/i-infy?tab=prices&page=1');
  });

  it('sends a Trades tab page past the end to the last page, and leaves page 0 and in-range pages alone', async () => {
    server.fetchInstrumentTrades.mockResolvedValue({ ...data.trades, totalElements: 30, totalPages: 2, number: 3 });
    await expect(renderPage({ tab: 'trades', page: '3' })).rejects.toThrow('REDIRECT /ds/investments/i-infy?tab=trades&page=1');
    redirect.mockClear();
    await renderPage({ tab: 'trades', page: '1' });
    server.fetchPricesPage.mockResolvedValue({ ...data.prices, items: [], totalElements: 0, totalPages: 0 });
    await renderPage({ tab: 'prices' });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('/ds/investments/[instrumentId]: failures in the price dialogs', () => {
  it('keeps the Edit dialog open and says so when the server refuses the new amount', async () => {
    api.PUT.mockRejectedValue(new Error('refused'));
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: /Edit manual price/ });
    fireEvent.change(within(dialog).getByLabelText('Price'), { target: { value: '1480' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save price' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Failed to update the price', { tone: 'danger' }));
    expect(screen.getByRole('dialog', { name: /Edit manual price/ })).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('keeps the Set-price dialog open and says so when the server refuses the price', async () => {
    api.POST.mockRejectedValue(new Error('refused'));
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'override' })[0]);
    const dialog = await screen.findByRole('dialog', { name: /Set manual price/ });
    fireEvent.change(within(dialog).getByLabelText('Price'), { target: { value: '1600' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save price' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Failed to update the price', { tone: 'danger' }));
    expect(screen.getByRole('dialog', { name: /Set manual price/ })).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
