import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bonus, buy, dividend, pageData, priceHistory, prices, rawDividends, rawPricePage, rawTrades } from '@/features/investments/holding/holding.fixtures';
import { corporateActionsSection, dividendsSection, pricesSection, tradesSection } from '@/features/investments/holding/holdingSectionsModel';
import { renderWithQuery } from '@/test/renderWithQuery';

import DsHoldingPage from './page';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
);
vi.mock('next/navigation', () => ({ unstable_rethrow: () => undefined,
  redirect,
  useRouter: () => router,
  usePathname: () => '/investments/i-infy',
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

// The pager's server actions: the real section readers over the mocked server api, in the action's result shape.
const wrap = <T,>(read: Promise<T>) => read.then((data) => ({ success: true as const, data }));
const actions = vi.hoisted(() => ({
  loadTradesPage: vi.fn(),
  loadDividendsPage: vi.fn(),
  loadCorporateActionsPage: vi.fn(),
  loadPricesPage: vi.fn(),
}));
vi.mock('@/features/investments/holding/holdingActions', () => actions);

vi.mock('@/components/organisms/Chart/Chart', () => ({
  Chart: ({ data }: { data: { categories: string[]; series: { data: number[] }[] } }) => (
    <div data-testid="chart">{`${data.categories.join(',')}|${data.series[0].data.join(',')}`}</div>
  ),
}));

// The record and edit dialogs are tested on their own: here they only show the props the page gives them.
vi.mock('@/features/investments/tradebook/TradeDialog', async () => (await import('@/test/fakeDialog')).fakeDialog('trade-dialog', 'RecordTradeDialog'));
vi.mock('@/features/investments/dividends/DividendFormDialog', async () => (await import('@/test/fakeDialog')).fakeDialog('dividend-dialog', 'DividendAddDialog'));
vi.mock('@/features/investments/corporate-actions/CorporateActionDialog', async () => (await import('@/test/fakeDialog')).fakeDialog('action-dialog', 'CorporateActionDialog'));
vi.mock('@/features/investments/instruments/InstrumentEditDialog', async () => {
  const { fakeDialog } = await import('@/test/fakeDialog');
  const Fake = fakeDialog('edit-dialog', 'InstrumentEditDialog').InstrumentEditDialog;
  return {
    InstrumentEditDialog: (props: { onSaved?: (r: unknown) => void } & Record<string, unknown>) => (
      <>
        <Fake {...props} />
        <button onClick={() => props.onSaved?.(editSaved.result)}>save edit</button>
      </>
    ),
  };
});
const editSaved = vi.hoisted(() => ({ result: {} as unknown }));
vi.mock('@/features/investments/instruments/ResetInstrumentDialog', async () => (await import('@/test/fakeDialog')).fakeDialog('reset-dialog', 'ResetInstrumentDialog'));

const api = vi.hoisted(() => ({ POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));
// Dinero hooks reach the API through server actions, which use serverApi: the same mock.
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));

const data = pageData();
const bonusAction = bonus as never;

async function renderPage(query: { tab?: string; page?: string } = {}) {
  // The page takes only its params: an old `?tab=` or `?page=` address is ignored.
  const ui = await (DsHoldingPage as (props: unknown) => Promise<React.ReactElement>)({
    params: Promise.resolve({ id: 'i-infy' }),
    searchParams: Promise.resolve(query),
  });
  return renderWithQuery(ui);
}

beforeEach(() => {
  vi.clearAllMocks();
  server.fetchHolding.mockResolvedValue(data.holding);
  server.fetchInstrument.mockResolvedValue(data.instrument);
  server.fetchSellEstimate.mockResolvedValue(data.estimate);
  server.fetchInstrumentTrades.mockResolvedValue(rawTrades());
  server.fetchInstrumentDividends.mockResolvedValue(rawDividends());
  server.fetchInstrumentCorporateActions.mockResolvedValue([bonusAction]);
  server.fetchPricesPage.mockResolvedValue(rawPricePage());
  server.fetchPriceHistory.mockResolvedValue(priceHistory);
  actions.loadTradesPage.mockImplementation((id: string, page: number) => wrap(tradesSection(id, page)));
  actions.loadDividendsPage.mockImplementation((id: string, page: number) => wrap(dividendsSection(id, page)));
  actions.loadCorporateActionsPage.mockImplementation((id: string, page: number) => wrap(corporateActionsSection(id, page)));
  actions.loadPricesPage.mockImplementation((id: string, page: number) => wrap(pricesSection(id, page)));
  api.POST.mockResolvedValue({ data: {} });
  api.PUT.mockResolvedValue({ data: {} });
  api.DELETE.mockResolvedValue({});
});

describe('/investments/[id]: data', () => {
  it('reads the first page of each list once, and the price history only when its dialog opens', async () => {
    await renderPage();
    expect(server.fetchHolding).toHaveBeenCalledWith('i-infy');
    expect(server.fetchSellEstimate).toHaveBeenCalledWith('i-infy');
    expect(server.fetchInstrumentTrades).toHaveBeenCalledTimes(1);
    expect(server.fetchInstrumentTrades).toHaveBeenCalledWith('i-infy', 0, 10);
    expect(server.fetchInstrumentDividends).toHaveBeenCalledWith('i-infy', 0, 10);
    expect(server.fetchInstrumentCorporateActions).toHaveBeenCalledTimes(1);
    expect(server.fetchPriceHistory).toHaveBeenCalledTimes(1);
    expect(server.fetchPriceHistory).toHaveBeenCalledWith(expect.any(String), 200);
    expect(server.fetchPricesPage).not.toHaveBeenCalled();
    // No second read when the cards mount.
    expect(actions.loadTradesPage).not.toHaveBeenCalled();
    expect(actions.loadDividendsPage).not.toHaveBeenCalled();
    expect(actions.loadCorporateActionsPage).not.toHaveBeenCalled();
  });

  it('renders the same page for an old ?tab= or ?page= address', async () => {
    await renderPage({ tab: 'prices', page: '5' });
    expect(screen.getByText('If you sell today')).toBeInTheDocument();
    expect(screen.getByText('Corporate actions')).toBeInTheDocument();
    expect(server.fetchInstrumentTrades).toHaveBeenCalledWith('i-infy', 0, 10);
    expect(redirect).not.toHaveBeenCalled();
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
    expect(screen.getByText('No dividends yet')).toBeInTheDocument();
  });
});

describe('/investments/[id]: Overview', () => {
  it('shows the title, no particulars line and the current value with its move', async () => {
    await renderPage();
    expect(screen.getAllByText('INFY · Infosys').length).toBeGreaterThan(0);
    expect(screen.queryByText('Stock')).not.toBeInTheDocument();
    expect(screen.queryByText('NSE · INE009A01021 · 2 brokers · long term')).not.toBeInTheDocument();
    expect(screen.getAllByText('+₹1,860 today · +2.1%').length).toBeGreaterThan(0);
  });

  it('shows Invested, ₹ return and XIRR in the hero, once each', async () => {
    await renderPage();
    for (const label of ['Invested', '₹ return', 'XIRR']) {
      expect(screen.getAllByText(label), label).toHaveLength(1);
    }
    expect(screen.getAllByText('31.4%')).toHaveLength(1);
    expect(screen.getAllByText('+₹48,162')).toHaveLength(1);
  });

  it('moves the other five figures into a Position card: Quantity, Avg cost, LTP, Realised P&L, Total charges', async () => {
    await renderPage();
    for (const label of ['Quantity', 'Avg cost', 'LTP', 'Realised P&L', 'Total charges']) {
      expect(screen.getAllByText(label), label).toHaveLength(1);
    }
    expect(screen.getByText('Position')).toBeInTheDocument();
    expect(screen.getAllByText('₹1,512.70').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('₹51.20')).toHaveLength(1);
    expect(screen.queryByText('across 2 trades')).toBeNull();
  });

  it('puts the identity and the actions in the header: the one fact at the left, Record trade and the menu at the right', async () => {
    await renderPage();
    expect(screen.getByText(/^Stock · NSE$/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Record trade' })[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument();
  });

  it('has no tabs: every card is on the one page', async () => {
    await renderPage();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    for (const title of ['Trades', 'Dividends', 'Corporate actions', 'By broker', 'If you sell today', 'Instrument']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.queryByText('Price history')).toBeNull();
  });

  it('labels the hero Current value, with no Dividend or Corporate action button in it', async () => {
    await renderPage();
    expect(screen.getByText('Current value')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dividend' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Corporate action' })).toBeNull();
  });

  it('shows Trades with their broker, side and value, and the lots line', async () => {
    await renderPage();
    expect(screen.getByText('3 lots · FIFO')).toBeInTheDocument();
    expect(screen.getAllByText('Buy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Zerodha').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹28,400').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Record trade' })).toHaveLength(2);
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
    expect(screen.getByText('Gain ₹48,162 · long term · tax ≈ ₹0 · ₹76,838 exemption left')).toBeInTheDocument();
    expect(screen.queryByText(/^Sell 20/)).toBeNull();
  });

  describe('the sell card: tax-free row and the quantity box', () => {
    const type = (value: string) => fireEvent.change(screen.getByPlaceholderText('Quantity'), { target: { value } });

    it('shows no tax-free row when the whole holding adds no tax: Sell all already says it', async () => {
      await renderPage();
      expect(screen.getByText('Sell all 60')).toBeInTheDocument();
      expect(screen.queryByText(/tax-free/)).toBeNull();
    });

    it('offers "Sell up to N tax-free" with the gain of N when the exemption runs out part way', async () => {
      server.fetchSellEstimate.mockResolvedValue({ ...data.estimate, exemptionLeftBefore: 20000, bookedEquityLongTermGain: 105000 });
      await renderPage();
      expect(screen.getByText('Sell all 60')).toBeInTheDocument();
      expect(screen.getByText('Sell up to 41 tax-free')).toBeInTheDocument();
      expect(screen.getByText('Gain ₹19,421 · long term · tax ≈ ₹0 · ₹579 exemption left')).toBeInTheDocument();
    });

    it('hides the tax-free row when the first lot is a short-term gain, for a non-equity holding and with no price', async () => {
      server.fetchSellEstimate.mockResolvedValue({
        ...data.estimate,
        lots: [{ ...data.estimate!.lots[0], term: 'short' }, ...data.estimate!.lots.slice(1)],
      });
      const first = await renderPage();
      expect(screen.queryByText(/tax-free/)).toBeNull();
      first.unmount();

      server.fetchSellEstimate.mockResolvedValue({ ...data.estimate, equity: false, tax: null, stcgTax: null, ltcgTax: null, stcgRate: null, ltcgRate: null, exemptionLeftBefore: null, exemptionLeftAfter: null });
      const second = await renderPage();
      expect(screen.queryByText(/tax-free/)).toBeNull();
      second.unmount();

      server.fetchSellEstimate.mockResolvedValue({ ...data.estimate, price: null, noPrice: true });
      await renderPage();
      expect(screen.queryByText(/tax-free/)).toBeNull();
      expect(screen.queryByPlaceholderText('Quantity')).toBeNull();
    });

    it('works the estimate of a typed quantity out in the page, with no server call', async () => {
      await renderPage();
      server.fetchSellEstimate.mockClear();
      type('20');
      expect(screen.getByText('Sell 20: Gain ₹1,854 · long term · tax ≈ ₹0 · ₹1,23,146 exemption left')).toBeInTheDocument();
      type('25');
      expect(screen.getByText('Sell 25: Gain ₹2,318 · long term · tax ≈ ₹0 · ₹1,22,683 exemption left')).toBeInTheDocument();
      expect(server.fetchSellEstimate).not.toHaveBeenCalled();
      expect(api.POST).not.toHaveBeenCalled();
    });

    it('names the limit and shows no estimate for an empty, zero or over-large quantity', async () => {
      await renderPage();
      expect(screen.queryByText(/^Up to 60 shares/)).toBeNull();
      for (const bad of ['0', '61']) {
        type(bad);
        expect(screen.getByText('Up to 60 shares.')).toBeInTheDocument();
        expect(screen.queryByText(/^Sell \d+:/)).toBeNull();
      }
      type('');
      expect(screen.queryByText('Up to 60 shares.')).toBeNull();
    });

    it('keeps only digits for a stock: letters, signs, commas and a decimal point are dropped', async () => {
      await renderPage();
      const box = screen.getByPlaceholderText('Quantity');
      type('a1b2');
      expect(box).toHaveValue('12');
      type('2.5');
      expect(box).toHaveValue('25');
      type('-2');
      expect(box).toHaveValue('2');
      type('abc');
      expect(box).toHaveValue('');
      expect(screen.queryByText(/^Up to 60 shares/)).toBeNull();
    });

    it('keeps digits and one decimal point for a fund', async () => {
      server.fetchHolding.mockResolvedValue({ ...data.holding, assetType: 'mutual_fund' });
      await renderPage();
      const box = screen.getByPlaceholderText('Quantity');
      type('12.5ab');
      expect(box).toHaveValue('12.5');
      type('1.2.3');
      expect(box).toHaveValue('1.23');
      type('x');
      expect(box).toHaveValue('');
    });
  });

  it('shows Dividends without a Final or Interim word, and Corporate actions without "Applied"', async () => {
    await renderPage();
    expect(screen.getByText('Dividend ₹22.00 / share')).toBeInTheDocument();
    expect(screen.getByText('ex 30 May 25 · paid 18 Jun 25 · TDS ₹132.00')).toBeInTheDocument();
    expect(screen.getByText('+₹1,320.00')).toBeInTheDocument();
    expect(screen.getByText('Bonus 1:1')).toBeInTheDocument();
    expect(screen.getByText('ex 10 Jun 25')).toBeInTheDocument();
    expect(screen.queryByText(/Final|Interim|Applied/)).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Record' })).toHaveLength(2);
  });

  it('shows the Instrument card with its catalog rows and no Edit button (Edit instrument is in the header menu)', async () => {
    await renderPage();
    for (const text of ['Shared catalog entry', 'INE009A01021', 'INFY.NS', 'Yahoo', 'none']) {
      expect(screen.getAllByText(text).length, text).toBeGreaterThan(0);
    }
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
  });
});

describe('/investments/[id]: record and edit dialogs', () => {
  const props = (id: string) => JSON.parse(screen.getByTestId(id).textContent ?? '{}') as Record<string, unknown>;
  const instrument = { id: 'i-infy', name: 'Infosys', symbol: 'INFY' };

  it('opens no dialog until one is asked for', async () => {
    await renderPage();
    for (const id of ['trade-dialog', 'dividend-dialog', 'action-dialog', 'edit-dialog']) expect(screen.queryByTestId(id)).toBeNull();
  });

  it('opens Record trade for the instrument from the Trades card, with no broker while two hold it', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Record trade' })[1]);
    await screen.findByTestId('trade-dialog');
    expect(props('trade-dialog')).toEqual({ initialInstrument: instrument });
  });

  const openMenu = async () => {
    fireEvent.pointerDown(screen.getByRole('button', { name: 'More actions' }), { button: 0 });
    return screen.findByRole('menu');
  };

  it('opens the header menu with the other records and Edit instrument', async () => {
    await renderPage();
    const menu = await openMenu();
    expect(within(menu).getAllByRole('menuitem').map((i) => i.textContent)).toEqual([
      'Record dividend',
      'Record corporate action',
      'Record price',
      'Edit instrument',
    ]);
  });

  it('opens Record trade from the header button', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Record trade' })[0]);
    expect(props('trade-dialog').initialInstrument).toEqual(instrument);
  });

  it('opens Record dividend from the header menu', async () => {
    await renderPage();
    fireEvent.click(within(await openMenu()).getByRole('menuitem', { name: 'Record dividend' }));
    await screen.findByTestId('dividend-dialog');
    expect((props('dividend-dialog').prefill as { instrumentId: string }).instrumentId).toBe('i-infy');
  });

  it('opens Record corporate action from the header menu', async () => {
    await renderPage();
    fireEvent.click(within(await openMenu()).getByRole('menuitem', { name: 'Record corporate action' }));
    await screen.findByTestId('action-dialog');
    expect(props('action-dialog')).toEqual({ instrument });
  });

  it('opens the manual price dialog, dated today, from the header menu', async () => {
    await renderPage();
    fireEvent.click(within(await openMenu()).getByRole('menuitem', { name: 'Record price' }));
    const dialog = await screen.findByRole('dialog', { name: /Record price/ });
    expect(within(dialog).getByDisplayValue('13/10/26')).toBeInTheDocument();
  });

  it('starts Record trade on the broker when only one holds the instrument', async () => {
    server.fetchHolding.mockResolvedValue({ ...data.holding, brokers: [data.holding.brokers[0]] });
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Record trade' })[1]);
    expect(props('trade-dialog').initialBrokerAccountId).toBe(data.holding.brokers[0].brokerAccountId);
  });

  it('opens Record dividend prefilled with the instrument from the Dividends card', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Record' })[0]);
    expect((props('dividend-dialog').prefill as { instrumentId: string }).instrumentId).toBe('i-infy');
  });

  it('opens Record corporate action for the instrument from the card', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Record' })[1]);
    expect(props('action-dialog')).toEqual({ instrument });
  });

  it('opens the instrument edit dialog from the header menu', async () => {
    await renderPage();
    fireEvent.click(within(await openMenu()).getByRole('menuitem', { name: 'Edit instrument' }));
    await screen.findByTestId('edit-dialog');
    expect((props('edit-dialog').instrument as { id: string }).id).toBe(data.instrument?.id);
  });
});

describe('/investments/[id]: instrument edit result', () => {
  async function openAndSave(result: unknown) {
    editSaved.result = result;
    await renderPage();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'More actions' }), { button: 0 });
    fireEvent.click(within(await screen.findByRole('menu')).getByRole('menuitem', { name: 'Edit instrument' }));
    fireEvent.click(screen.getByRole('button', { name: 'save edit' }));
  }

  it('goes to the new holding when the holdings moved to another instrument', async () => {
    await openAndSave({ instrument: { id: 'i-new' }, moved: true, merged: false });
    expect(router.replace).toHaveBeenCalledWith('/investments/i-new');
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('goes to the existing holding when they merged into it', async () => {
    await openAndSave({ instrument: { id: 'i-other' }, moved: true, merged: true });
    expect(router.replace).toHaveBeenCalledWith('/investments/i-other');
  });

  it('only refreshes the page when the instrument stayed', async () => {
    await openAndSave({ instrument: { id: 'i-same' }, moved: false, merged: false });
    expect(router.refresh).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('/investments/[id]: Price chart', () => {
  it('draws the daily close over one year to start with, oldest first', async () => {
    await renderPage();
    expect(screen.getByText('Price · 1 year')).toBeInTheDocument();
    expect(screen.getByText('Daily close')).toBeInTheDocument();
    expect(screen.getByTestId('chart')).toHaveTextContent('1 Aug,20 Sep,13 Oct|1400,1450,1512.7');
  });

  it('narrows the range from the 1m / 3m / 1y / All control', async () => {
    await renderPage();
    for (const label of ['1m', '3m', '1y', 'All']) expect(screen.getByRole('radio', { name: label })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: '1m' }));
    expect(screen.getByText('Price · 1 month')).toBeInTheDocument();
    // Counted back from the newest price: 20 Sep and 13 Oct are within a month.
    expect(screen.getByTestId('chart')).toHaveTextContent('20 Sep,13 Oct|1450,1512.7');
    fireEvent.click(screen.getByRole('radio', { name: '3m' }));
    expect(screen.getByTestId('chart')).toHaveTextContent('1 Aug,20 Sep,13 Oct|1400,1450,1512.7');
    fireEvent.click(screen.getByRole('radio', { name: 'All' }));
    expect(screen.getByText('Price · All time')).toBeInTheDocument();
  });

  it('draws split-adjusted prices: those before a split divided by its ratio, those on or after unchanged', async () => {
    server.fetchInstrumentCorporateActions.mockResolvedValue([{ id: 'sp', instrumentId: 'i-infy', type: 'split', ratioFrom: 1, ratioTo: 2, exDate: '2026-09-20' }]);
    await renderPage();
    expect(screen.getByTestId('chart')).toHaveTextContent('1 Aug,20 Sep,13 Oct|700,1450,1512.7');
  });

  it('says there are too few prices to draw', async () => {
    server.fetchPriceHistory.mockResolvedValue(data.history!.slice(0, 1));
    await renderPage();
    expect(screen.getByText('Not enough prices to draw a chart yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('chart')).toBeNull();
  });

  it('says the chart could not load, and still offers the Price history button, when the history cannot be read', async () => {
    server.fetchPriceHistory.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.getByText("Couldn't load the price chart.")).toBeInTheDocument();
    expect(screen.queryByTestId('chart')).toBeNull();
    expect(screen.getByRole('button', { name: 'Price history' })).toBeInTheDocument();
  });
});

/** Opens the Price history dialog from the chart card's icon button. */
async function openHistory() {
  fireEvent.click(screen.getByRole('button', { name: 'Price history' }));
  return screen.findByRole('dialog', { name: 'Price history' });
}

describe('/investments/[id]: Price history dialog', () => {
  it('is opened by the icon button in the chart card header, and reads its first page then', async () => {
    await renderPage();
    expect(screen.queryByRole('dialog', { name: 'Price history' })).toBeNull();
    const dialog = await openHistory();
    expect(await within(dialog).findByText('13 Oct')).toBeInTheDocument();
    expect(server.fetchPricesPage).toHaveBeenCalledTimes(1);
    expect(server.fetchPricesPage).toHaveBeenCalledWith('i-infy', 0, 5);
    expect(within(dialog).getAllByText('Yahoo').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('manual price')).toBeInTheDocument();
    expect(within(dialog).getByText('₹1,470.00')).toBeInTheDocument();
  });

  it("puts Edit and Delete only on the user's own manual price", async () => {
    await renderPage();
    const dialog = await openHistory();
    await within(dialog).findByText('13 Oct');
    expect(within(dialog).getAllByRole('button', { name: 'Edit' })).toHaveLength(1);
    expect(within(dialog).getAllByRole('button', { name: 'Delete' })).toHaveLength(1);
  });

  it('shows no Edit or Delete when every price is from a feed', async () => {
    server.fetchPricesPage.mockResolvedValue({ ...rawPricePage(), items: prices.filter((p) => !p.editable) });
    await renderPage();
    const dialog = await openHistory();
    await within(dialog).findByText('13 Oct');
    expect(within(dialog).queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(within(dialog).queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('pages server-side: a page press asks the server for that page', async () => {
    server.fetchPricesPage.mockResolvedValue({ ...rawPricePage(), totalElements: 40, totalPages: 4 });
    await renderPage();
    const dialog = await openHistory();
    await within(dialog).findByText('13 Oct');
    server.fetchPricesPage.mockResolvedValue({ ...rawPricePage(), page: 1, totalElements: 40, totalPages: 4, items: [{ id: null, asOf: '2026-09-01', close: 1300, source: 'YAHOO', editable: false }] });
    fireEvent.click(within(dialog).getAllByRole('button', { name: /next/i })[0]);
    expect(await within(dialog).findByText('1 Sep')).toBeInTheDocument();
    expect(server.fetchPricesPage).toHaveBeenLastCalledWith('i-infy', 1, 5);
  });

  it('says so and offers Retry when the first page cannot be read', async () => {
    actions.loadPricesPage.mockResolvedValueOnce({ success: false, error: { message: "Couldn't load the price history. Try again." } });
    await renderPage();
    const dialog = await openHistory();
    expect(await within(dialog).findByText("Couldn't load the price history.")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Retry' }));
    expect(await within(dialog).findByText('13 Oct')).toBeInTheDocument();
  });

  it('says so when there are no prices', async () => {
    server.fetchPricesPage.mockResolvedValue({ ...rawPricePage(), items: [], totalElements: 0, totalPages: 0 });
    await renderPage();
    const dialog = await openHistory();
    expect(await within(dialog).findByText('No prices yet')).toBeInTheDocument();
  });

  it('edits the amount of a manual price: the date is shown, can change, and is sent only when changed', async () => {
    await renderPage();
    const history = await openHistory();
    fireEvent.click(await within(history).findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: /Edit manual price/ });
    expect(within(dialog).getByDisplayValue('10/10/26')).toBeEnabled();
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
    // The list is read again for the page being shown.
    await waitFor(() => expect(server.fetchPricesPage).toHaveBeenCalledTimes(2));
  });

  it('refuses a price that is not above zero', async () => {
    await renderPage();
    const history = await openHistory();
    fireEvent.click(await within(history).findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: /Edit manual price/ });
    fireEvent.change(within(dialog).getByLabelText('Price'), { target: { value: '0' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save price' }));
    expect(await within(dialog).findByText('Enter a price above zero.')).toBeInTheDocument();
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('confirms before deleting, says what goes and what stays, then deletes', async () => {
    await renderPage();
    const history = await openHistory();
    fireEvent.click(await within(history).findByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete manual price?' });
    expect(within(dialog).getByText('Your manual price of ₹1,470.00 on 10 Oct goes.')).toBeInTheDocument();
    expect(within(dialog).getByText('Only this price is deleted.')).toBeInTheDocument();
    expect(within(dialog).getByText('Your trades and the other prices stay.')).toBeInTheDocument();
    expect(api.DELETE).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api.DELETE).toHaveBeenCalled());
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
      params: { path: { instrumentId: 'i-infy', priceId: 'p3' } },
    });
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Price deleted'));
    expect(router.refresh).toHaveBeenCalled();
  });

  it('keeps the price and says so when the delete fails', async () => {
    api.DELETE.mockRejectedValue(new Error('Could not delete'));
    await renderPage();
    const history = await openHistory();
    fireEvent.click(await within(history).findByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete manual price?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Couldn't delete the price. Try again.", { tone: 'danger' }));
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('keeps the Edit dialog open and says so when the server refuses the new amount', async () => {
    api.PUT.mockRejectedValue(new Error('refused'));
    await renderPage();
    const history = await openHistory();
    fireEvent.click(await within(history).findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: /Edit manual price/ });
    fireEvent.change(within(dialog).getByLabelText('Price'), { target: { value: '1480' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save price' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Couldn't update the price. Try again.", { tone: 'danger' }));
    expect(screen.getByRole('dialog', { name: /Edit manual price/ })).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});

describe('/investments/[id]: manual price from the LTP override', () => {
  it('sets a manual price from the LTP "override" link, dated today', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'override' })[0]);
    const dialog = await screen.findByRole('dialog', { name: /Record price/ });
    const date = within(dialog).getByDisplayValue('13/10/26');
    expect(date).not.toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Price'), { target: { value: '1600' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Record price' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/instruments/{id}/price', {
      params: { path: { id: 'i-infy' } },
      body: { price: 1600, asOf: '2026-10-13' },
    });
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Price updated for Infosys'));
  });

  it('keeps the Set-price dialog open and says so when the server refuses the price', async () => {
    api.POST.mockRejectedValue(new Error('refused'));
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'override' })[0]);
    const dialog = await screen.findByRole('dialog', { name: /Record price/ });
    fireEvent.change(within(dialog).getByLabelText('Price'), { target: { value: '1600' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Record price' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Couldn't update the price. Try again.", { tone: 'danger' }));
    expect(screen.getByRole('dialog', { name: /Record price/ })).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});

describe('/investments/[id]: each list pages on its own', () => {
  it('Trades: a page press reads that page from the server and shows its rows', async () => {
    server.fetchInstrumentTrades.mockResolvedValue({ ...rawTrades(), totalElements: 30, totalPages: 3 });
    await renderPage();
    server.fetchInstrumentTrades.mockResolvedValue({
      ...rawTrades(),
      number: 1,
      totalElements: 30,
      totalPages: 3,
      content: [buy({ id: 't9', brokerName: 'Kite', quantity: 7 })],
    });
    fireEvent.click(screen.getAllByRole('button', { name: /next/i })[0]);
    await waitFor(() => expect(actions.loadTradesPage).toHaveBeenCalledWith('i-infy', 1));
    expect((await screen.findAllByText('Kite')).length).toBeGreaterThan(0);
  });

  it('Dividends: pager above and below, a page press calls the dividends action', async () => {
    server.fetchInstrumentDividends.mockResolvedValue({ ...rawDividends(), totalElements: 25, totalPages: 3 });
    await renderPage();
    const next = screen.getAllByRole('button', { name: /next/i });
    expect(next.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(next[next.length - 1]);
    await waitFor(() => expect(actions.loadDividendsPage).toHaveBeenCalledWith('i-infy', 1));
  });

  it('Corporate actions: pages are cut on the server, never in the browser', async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...(bonus as object), id: `ca${i}` })) as never[];
    server.fetchInstrumentCorporateActions.mockResolvedValue(many);
    await renderPage();
    expect(screen.getAllByText('Bonus 1:1')).toHaveLength(10);
    const next = screen.getAllByRole('button', { name: /next/i });
    fireEvent.click(next[next.length - 1]);
    await waitFor(() => expect(actions.loadCorporateActionsPage).toHaveBeenCalledWith('i-infy', 1));
    await waitFor(() => expect(screen.getAllByText('Bonus 1:1')).toHaveLength(2));
  });

  it('keeps the page the user is on when the route refreshes with the same data, and resets when the data changed', async () => {
    server.fetchInstrumentDividends.mockResolvedValue({ ...rawDividends(), totalElements: 25, totalPages: 3 });
    const view = await renderPage();
    server.fetchInstrumentDividends.mockResolvedValue({
      ...rawDividends(),
      number: 1,
      totalElements: 25,
      totalPages: 3,
      content: [{ ...dividend, id: 'd2', perUnit: 9, amount: 540 }],
    });
    const next = screen.getAllByRole('button', { name: /next/i });
    fireEvent.click(next[next.length - 1]);
    expect(await screen.findByText('Dividend ₹9.00 / share')).toBeInTheDocument();

    // A refresh (live prices, focus) renders the server's page 0 again, unchanged: the user stays on page 1.
    server.fetchInstrumentDividends.mockResolvedValue({ ...rawDividends(), totalElements: 25, totalPages: 3 });
    const ui = await (DsHoldingPage as (props: unknown) => Promise<React.ReactElement>)({ params: Promise.resolve({ id: 'i-infy' }) });
    view.rerender(ui);
    expect(screen.getByText('Dividend ₹9.00 / share')).toBeInTheDocument();

    // A record that changes page 0 shows page 0.
    server.fetchInstrumentDividends.mockResolvedValue({ ...rawDividends(), totalElements: 26, totalPages: 3, content: [{ ...dividend, id: 'd3', perUnit: 30, amount: 1800 }] });
    const changed = await (DsHoldingPage as (props: unknown) => Promise<React.ReactElement>)({ params: Promise.resolve({ id: 'i-infy' }) });
    view.rerender(changed);
    expect(await screen.findByText('Dividend ₹30.00 / share')).toBeInTheDocument();
  });

  it('shows a toast and keeps the rows when a page cannot be read', async () => {
    server.fetchInstrumentDividends.mockResolvedValue({ ...rawDividends(), totalElements: 25, totalPages: 3 });
    await renderPage();
    actions.loadDividendsPage.mockResolvedValue({ success: false, error: { message: "Couldn't load the dividends. Try again." } });
    const next = screen.getAllByRole('button', { name: /next/i });
    fireEvent.click(next[next.length - 1]);
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Couldn't load the dividends. Try again.", { tone: 'danger' }));
    expect(screen.getByText('Dividend ₹22.00 / share')).toBeInTheDocument();
  });

  it('has plain figures on desktop and ₹ on phone: no ₹ in the Price column or the P&L caption', async () => {
    server.fetchInstrumentTrades.mockResolvedValue({
      ...rawTrades(),
      content: [buy({ id: 's1', type: 'sell', quantity: 10, price: 1500, realisedPnl: 800 })],
    });
    await renderPage();
    expect(screen.getByText('1,500.00')).toBeInTheDocument();
    expect(screen.getByText('15,000')).toBeInTheDocument();
    expect(screen.getByText('₹15,000')).toBeInTheDocument();
    expect(screen.getByText('P&L +800')).toBeInTheDocument();
  });
});
