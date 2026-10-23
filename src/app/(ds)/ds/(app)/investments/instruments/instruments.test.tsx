import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { instrument, instrumentPage, sampleInstruments } from '@/features/investments/instruments/instruments.fixtures';
import { ApiError } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import DsInstrumentsPage from './page';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
);
vi.mock('next/navigation', () => ({
  redirect,
  useRouter: () => router,
  usePathname: () => '/ds/investments/instruments',
  useSearchParams: () => new URLSearchParams(),
}));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const server = vi.hoisted(() => ({ fetchLatestPriceJobId: vi.fn() }));
vi.mock('@/features/investments/investmentsServerApi', () => server);

const list = vi.hoisted(() => ({ fetchInstrumentsPage: vi.fn(), fetchInstrumentTypeCounts: vi.fn() }));
vi.mock('@/features/investments/instruments/instrumentsServerApi', () => list);

const refresh = vi.hoisted(() => vi.fn());
const refreshState = vi.hoisted(() => ({ busy: false, jobId: null as string | null, onSettled: undefined as undefined | (() => void) }));
vi.mock('@/features/investments/useRefreshPrices', () => ({
  useRefreshPrices: (options: { onSettled?: () => void }) => {
    refreshState.onSettled = options.onSettled;
    return { refresh, busy: refreshState.busy, jobId: refreshState.jobId };
  },
}));

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

async function renderPage(params: Record<string, string> = {}) {
  const ui = await DsInstrumentsPage({ searchParams: Promise.resolve(params) });
  return renderWithQuery(ui);
}

beforeEach(() => {
  vi.clearAllMocks();
  refreshState.busy = false;
  refreshState.jobId = null;
  list.fetchInstrumentsPage.mockResolvedValue(instrumentPage());
  list.fetchInstrumentTypeCounts.mockResolvedValue({ stock: 6, mutual_fund: 3, etf: 2 });
  server.fetchLatestPriceJobId.mockResolvedValue('job-9');
  api.GET.mockResolvedValue({ data: [] });
  api.POST.mockResolvedValue({ data: instrument({ id: 'new', name: 'Bajaj Housing Finance' }) });
  api.PUT.mockResolvedValue({ data: instrument() });
  api.PATCH.mockResolvedValue({ data: instrument() });
  api.DELETE.mockResolvedValue({ data: instrument() });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('/ds/investments/instruments: data', () => {
  it('asks the server for the first page by name and the type counts', async () => {
    await renderPage();
    expect(list.fetchInstrumentsPage).toHaveBeenCalledWith({ page: 0, size: 50 });
    expect(list.fetchInstrumentTypeCounts).toHaveBeenCalledWith(expect.objectContaining({ q: '', type: '', stale: false, page: 0 }));
  });

  it('passes search, type, stale, order, page and size from the URL to the server', async () => {
    list.fetchInstrumentsPage.mockResolvedValue(instrumentPage(sampleInstruments, { totalElements: 120, totalPages: 3, page: 1 }));
    await renderPage({ q: 'tata', type: 'etf', stale: '1', sort: 'desc', page: '1', size: '25' });
    expect(list.fetchInstrumentsPage).toHaveBeenCalledWith({ search: 'tata', type: 'etf', sort: 'name,desc', stale: true, page: 1, size: 25 });
  });

  it('shows a load error with Try again when the list cannot be read', async () => {
    list.fetchInstrumentsPage.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.getByText('Could not load instruments')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(router.refresh).toHaveBeenCalled();
  });

  it('still shows the list when the type counts fail', async () => {
    list.fetchInstrumentTypeCounts.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.getAllByText('Infosys').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Stocks' })).toBeInTheDocument();
  });

  it('sends the visitor to the last page when the address is past the end', async () => {
    list.fetchInstrumentsPage.mockResolvedValue(instrumentPage([], { totalElements: 120, totalPages: 3, page: 7 }));
    await expect(renderPage({ page: '7', type: 'stock' })).rejects.toThrow('REDIRECT /ds/investments/instruments?type=stock&page=2');
  });
});

describe('/ds/investments/instruments: rows', () => {
  it('shows each instrument with its type, exchange, identifier, price, source and day', async () => {
    await renderPage();
    expect(screen.getAllByText('Infosys').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/· INFY/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('INE009A01021').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1,512.70').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Yahoo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('13 Oct').length).toBeGreaterThan(0);
    expect(screen.getAllByText('AMFI 118834').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Manual').length).toBeGreaterThan(0);
  });

  it('marks an instrument nobody holds any more', async () => {
    await renderPage();
    expect(screen.getAllByText('Not held')).toHaveLength(1);
  });

  it('marks an edited instrument and offers Reset to catalog on it', async () => {
    await renderPage();
    expect(screen.getAllByText(/Edited for your account/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Reset to catalog' }).length).toBeGreaterThan(0);
  });

  it('says No price for an instrument with none', async () => {
    list.fetchInstrumentsPage.mockResolvedValue(instrumentPage([instrument({ lastPrice: null, lastPriceAsOf: null, lastPriceSource: null })]));
    await renderPage();
    expect(screen.getAllByText('No price').length).toBeGreaterThan(0);
  });

  it('shows the Pager above and below with the server totals, and pages through the URL', async () => {
    list.fetchInstrumentsPage.mockResolvedValue(instrumentPage(sampleInstruments, { totalElements: 120, totalPages: 3 }));
    await renderPage({ type: 'stock' });
    expect(screen.getAllByText('/ 120').length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getAllByRole('button', { name: /next/i })[0]);
    expect(router.push).toHaveBeenCalledWith('/ds/investments/instruments?type=stock&page=1', { scroll: false });
  });

  it('explains an empty catalog and opens Add instrument from it', async () => {
    list.fetchInstrumentsPage.mockResolvedValue(instrumentPage([]));
    await renderPage();
    expect(screen.getByText(/No instruments recorded yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add instrument' }));
    expect(await screen.findByRole('dialog', { name: 'Add instrument' })).toBeInTheDocument();
  });

  it('says nothing matches a filter, and Clear filters drops it', async () => {
    list.fetchInstrumentsPage.mockResolvedValue(instrumentPage([]));
    await renderPage({ q: 'zzz', type: 'etf', stale: '1' });
    expect(screen.getByText('No instruments match your search or filter.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.push).toHaveBeenCalledWith('/ds/investments/instruments', { scroll: false });
  });
});

describe('/ds/investments/instruments: filters go to the URL', () => {
  it('filters by type from the chips, back to the first page, with counts', async () => {
    list.fetchInstrumentsPage.mockResolvedValue(instrumentPage(sampleInstruments, { totalElements: 120, totalPages: 3 }));
    await renderPage({ page: '2' });
    expect(screen.getByRole('button', { name: /^Stocks/ })).toHaveTextContent('Stocks · 6');
    expect(screen.getByRole('button', { name: /^Funds/ })).toHaveTextContent('Funds · 3');
    expect(screen.getByRole('button', { name: /^ETFs/ })).toHaveTextContent('ETFs · 2');
    fireEvent.click(screen.getByRole('button', { name: /^Funds/ }));
    expect(router.push).toHaveBeenCalledWith('/ds/investments/instruments?type=mutual_fund', { scroll: false });
  });

  it('clears the type with All types, keeping the other filters', async () => {
    await renderPage({ type: 'etf', stale: '1' });
    fireEvent.click(screen.getByRole('button', { name: 'All types' }));
    expect(router.push).toHaveBeenCalledWith('/ds/investments/instruments?stale=1', { scroll: false });
  });

  it('toggles Stale price on and off', async () => {
    const { unmount } = await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Stale price' }));
    expect(router.push).toHaveBeenLastCalledWith('/ds/investments/instruments?stale=1', { scroll: false });
    unmount();
    await renderPage({ stale: '1' });
    fireEvent.click(screen.getByRole('button', { name: 'Stale price' }));
    expect(router.push).toHaveBeenLastCalledWith('/ds/investments/instruments', { scroll: false });
  });

  it('searches the server once typing pauses, from the first page', async () => {
    list.fetchInstrumentsPage.mockResolvedValue(instrumentPage(sampleInstruments, { totalElements: 120, totalPages: 3 }));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await renderPage({ page: '2' });
    fireEvent.change(screen.getByPlaceholderText('Search symbol, ISIN, name'), { target: { value: 'tata' } });
    expect(router.push).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/ds/investments/instruments?q=tata', { scroll: false });
  });

  it('orders by name, A–Z first, Z–A from the dropdown', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Name A–Z/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'Name Z–A' }));
    expect(router.push).toHaveBeenCalledWith('/ds/investments/instruments?sort=desc', { scroll: false });
  });
});

describe('/ds/investments/instruments: prices line', () => {
  it('starts a refresh and reloads the page when the job ends', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh prices' }));
    expect(refresh).toHaveBeenCalled();
    act(() => refreshState.onSettled?.());
    expect(router.refresh).toHaveBeenCalled();
  });

  it('links View job to the newest price job in Settings → Activity', async () => {
    await renderPage();
    expect(screen.getByRole('link', { name: 'View job' })).toHaveAttribute('href', '/ds/settings/activity?job=job-9');
  });

  it('links the job this session started, and hides View job when none ever ran', async () => {
    refreshState.jobId = 'job-new';
    const { unmount } = await renderPage();
    expect(screen.getByRole('link', { name: 'View job' })).toHaveAttribute('href', '/ds/settings/activity?job=job-new');
    unmount();
    refreshState.jobId = null;
    server.fetchLatestPriceJobId.mockResolvedValue(null);
    await renderPage();
    expect(screen.queryByRole('link', { name: 'View job' })).toBeNull();
  });
});

describe('/ds/investments/instruments: edit', () => {
  const open = async (name = 'Infosys') => {
    fireEvent.click(screen.getByRole('button', { name: `Edit ${name}` }));
    return screen.findByRole('dialog', { name: 'Edit instrument' });
  };

  it('opens from the pencil with the instrument filled in', async () => {
    await renderPage();
    const dialog = await open();
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Infosys');
    expect(within(dialog).getByLabelText('Symbol')).toHaveValue('INFY');
    expect(within(dialog).getByLabelText('ISIN')).toHaveValue('INE009A01021');
    expect(within(dialog).getByLabelText('Yahoo symbol')).toHaveValue('INFY.NS');
    expect(within(dialog).queryByRole('button', { name: 'Reset to catalog' })).toBeNull();
  });

  it('saves for the account only and refreshes the page', async () => {
    await renderPage();
    const dialog = await open();
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Infosys Ltd' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save instrument' }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/instruments/{id}', {
      params: { path: { id: 'i-infy' } },
      body: expect.objectContaining({ type: 'stock', name: 'Infosys Ltd', symbol: 'INFY', isin: 'INE009A01021', yahooSymbol: 'INFY.NS', currency: 'INR' }),
    });
    expect(api.PATCH).not.toHaveBeenCalled();
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Updated Infosys for your account', { tone: 'success' });
  });

  it('refuses a blank name without calling the server', async () => {
    await renderPage();
    const dialog = await open();
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: '  ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save instrument' }));
    expect(await within(dialog).findByText('Name is required')).toBeInTheDocument();
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('refuses to clear an identifier without entering another', async () => {
    await renderPage();
    const dialog = await open();
    fireEvent.change(within(dialog).getByLabelText('ISIN'), { target: { value: '' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save instrument' }));
    expect(await within(dialog).findByText(/The ISIN can't be cleared/)).toBeInTheDocument();
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('shows the server\'s field errors under the field', async () => {
    api.PUT.mockRejectedValue(new ApiError(400, { code: 'VALIDATION_ERROR', message: 'Invalid', details: { symbol: 'Symbol is too long' } }));
    await renderPage();
    const dialog = await open();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save instrument' }));
    expect(await within(dialog).findByText('Symbol is too long')).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('toasts a failure that is not a bad request', async () => {
    api.PUT.mockRejectedValue(new Error('down'));
    await renderPage();
    const dialog = await open();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save instrument' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Failed to update instrument', { tone: 'danger' }));
  });

  it('says when the holdings moved to another instrument', async () => {
    api.PUT.mockResolvedValue({ data: instrument({ id: 'i-other', name: 'Infosys New' }) });
    api.PATCH.mockResolvedValue({ data: instrument({ id: 'i-other', name: 'Infosys New' }) });
    await renderPage();
    const dialog = await open();
    fireEvent.change(within(dialog).getByLabelText('ISIN'), { target: { value: 'INE999Z01011' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save instrument' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Moved your holdings to Infosys New', { tone: 'success' }));
  });

  it('fills the form from a catalog pick without saving', async () => {
    api.GET.mockResolvedValue({
      data: [{ source: 'YAHOO', type: 'stock', name: 'Infosys Limited', symbol: 'INFY', exchange: 'NSE', yahooSymbol: 'INFY.NS', isin: 'INE009A01021' }],
    });
    await renderPage();
    const dialog = await open();
    fireEvent.change(within(dialog).getByPlaceholderText(/Search AMFI or Yahoo/), { target: { value: 'infosys' } });
    fireEvent.click(await within(dialog).findByRole('button', { name: /Infosys Limited/ }));
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Infosys Limited');
    expect(api.PUT).not.toHaveBeenCalled();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('opens from the row on phone, where there is no pencil', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByText('Tata Motors')[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Edit instrument' });
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Tata Motors');
  });
});

describe('/ds/investments/instruments: asset class and reset', () => {
  it('pins an asset class after the save', async () => {
    api.PUT.mockResolvedValue({ data: instrument() });
    api.PATCH.mockResolvedValue({ data: instrument() });
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Infosys' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit instrument' });
    fireEvent.click(within(dialog).getByRole('combobox', { name: /^Asset class/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'Gold' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save instrument' }));
    await waitFor(() => expect(api.PATCH).toHaveBeenCalledWith('/api/v1/instruments/{id}', { params: { path: { id: 'i-infy' } }, body: { assetClass: 'GOLD' } }));
  });

  it('offers Reset to catalog in the edit dialog for an edited instrument, and confirms first', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Mirae Asset Large Cap · Direct Growth' }));
    const edit = await screen.findByRole('dialog', { name: 'Edit instrument' });
    fireEvent.click(within(edit).getByRole('button', { name: 'Reset to catalog' }));
    const confirm = await screen.findByRole('alertdialog', { name: /Reset to catalog/ }).catch(() => screen.findByRole('dialog', { name: /Reset to catalog/ }));
    expect(confirm).toHaveTextContent('Your edits to Mirae Asset Large Cap · Direct Growth (name and asset class) are removed');
    expect(api.DELETE).not.toHaveBeenCalled();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Reset to catalog' }));
    await waitFor(() => expect(api.DELETE).toHaveBeenCalledWith('/api/v1/instruments/{id}/overrides', { params: { path: { id: 'i-mirae' } } }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Infosys reset to catalog', { tone: 'success' });
  });

  it('resets from the row link, and Cancel keeps the edits', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Reset to catalog' })[0]);
    const confirm = await screen.findByRole('dialog', { name: /Reset to catalog/ });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Reset to catalog/ })).toBeNull());
    expect(api.DELETE).not.toHaveBeenCalled();
  });
});

describe('/ds/investments/instruments: add', () => {
  const openManual = async () => {
    fireEvent.click(screen.getByRole('button', { name: 'enter it by hand' }));
    return screen.findByRole('dialog', { name: 'Add instrument' });
  };

  it('opens on the manual form from the "enter it by hand" link', async () => {
    await renderPage();
    const dialog = await openManual();
    expect(within(dialog).getByLabelText('Name')).toHaveValue('');
    expect(within(dialog).getByLabelText('Exchange')).toHaveValue('NSE');
    expect(within(dialog).getByLabelText('Currency')).toHaveValue('INR');
  });

  it('fills the Yahoo symbol from the symbol until it is typed over', async () => {
    await renderPage();
    const dialog = await openManual();
    fireEvent.change(within(dialog).getByLabelText('Symbol'), { target: { value: 'bajajhfl' } });
    expect(within(dialog).getByLabelText('Yahoo symbol')).toHaveValue('BAJAJHFL.NS');
    fireEvent.change(within(dialog).getByLabelText('Yahoo symbol'), { target: { value: 'BAJAJHFL.BO' } });
    fireEvent.change(within(dialog).getByLabelText('Symbol'), { target: { value: 'bajaj' } });
    expect(within(dialog).getByLabelText('Yahoo symbol')).toHaveValue('BAJAJHFL.BO');
  });

  it('requires a name', async () => {
    await renderPage();
    const dialog = await openManual();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add instrument' }));
    expect(await within(dialog).findByText('Name is required')).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('creates the instrument by hand and refreshes the page', async () => {
    await renderPage();
    const dialog = await openManual();
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: ' Bajaj Housing Finance ' } });
    fireEvent.change(within(dialog).getByLabelText('Symbol'), { target: { value: 'BAJAJHFL' } });
    fireEvent.change(within(dialog).getByLabelText(/ISIN/), { target: { value: 'INE377Y01014' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add instrument' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/instruments', {
      body: {
        type: 'stock',
        name: 'Bajaj Housing Finance',
        symbol: 'BAJAJHFL',
        exchange: 'NSE',
        isin: 'INE377Y01014',
        amfiCode: undefined,
        yahooSymbol: 'BAJAJHFL.NS',
        currency: 'INR',
      },
    });
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Created instrument Bajaj Housing Finance', { tone: 'success' });
  });

  it('shows a bad request under the form and keeps the dialog open', async () => {
    api.POST.mockRejectedValue(new ApiError(400, { code: 'BAD_REQUEST', message: 'An instrument with that ISIN already exists' }));
    await renderPage();
    const dialog = await openManual();
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Dup' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add instrument' }));
    expect(await within(dialog).findByText('An instrument with that ISIN already exists')).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('searches the catalog, and a pick creates the instrument', async () => {
    api.GET.mockResolvedValue({
      data: [
        { source: 'LOCAL', type: 'stock', name: 'Infosys', symbol: 'INFY', exchange: 'NSE', existingInstrumentId: 'i-infy' },
        { source: 'AMFI', type: 'mutual_fund', name: 'Parag Parikh Flexi Cap', amfiCode: '122639', pricePreview: { value: '92.31', asOf: '12 Oct' } },
      ],
    });
    api.POST.mockResolvedValue({ data: instrument({ id: 'i-ppfas', name: 'Parag Parikh Flexi Cap' }) });
    await renderPage();
    const add = await openCatalogFromEmpty();
    expect(within(add).getByText('Type at least 2 characters to search.')).toBeInTheDocument();
    fireEvent.change(within(add).getByPlaceholderText(/Search by name or symbol/), { target: { value: 'parag' } });
    expect(await within(add).findByText('In your catalog')).toBeInTheDocument();
    expect(within(add).getByText('Search results')).toBeInTheDocument();
    fireEvent.click(within(add).getByRole('button', { name: /Parag Parikh Flexi Cap/ }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/instruments/resolve', { body: expect.objectContaining({ name: 'Parag Parikh Flexi Cap', amfiCode: '122639', type: 'mutual_fund' }) }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Added Parag Parikh Flexi Cap', { tone: 'success' });
  });

  it('says when the catalog has no match and points at the manual form', async () => {
    api.GET.mockResolvedValue({ data: [] });
    await renderPage();
    const add = await openCatalogFromEmpty();
    fireEvent.change(within(add).getByPlaceholderText(/Search by name or symbol/), { target: { value: 'zzzz' } });
    expect(await within(add).findByText('No matches. Enter it by hand.')).toBeInTheDocument();
  });

  it('switches between Catalog and Enter manually in the dialog', async () => {
    await renderPage();
    const add = await openCatalogFromEmpty();
    fireEvent.click(within(add).getByRole('radio', { name: 'Enter manually' }));
    expect(within(add).getByLabelText('Name')).toBeInTheDocument();
    fireEvent.click(within(add).getByRole('radio', { name: 'Catalog' }));
    expect(within(add).queryByLabelText('Name')).toBeNull();
  });

  async function openCatalogFromEmpty() {
    list.fetchInstrumentsPage.mockResolvedValue(instrumentPage([]));
    document.body.innerHTML = '';
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Add instrument' }));
    return screen.findByRole('dialog', { name: 'Add instrument' });
  }
});
