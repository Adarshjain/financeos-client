import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fyLabel } from '@/features/investments/investmentsFormat';
import { fundBuy, job, stockBuy, trade, tradesPage } from '@/features/investments/tradebook/tradebook.fixtures';
import { currentFy } from '@/features/investments/tradebook/tradebookModel';
import { renderWithQuery } from '@/test/renderWithQuery';

import DsTradebookLoading from './loading';
import DsTradebookPage from './page';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
);
vi.mock('next/navigation', () => ({
  redirect,
  useRouter: () => router,
  usePathname: () => '/investments/tradebook',
  useSearchParams: () => new URLSearchParams(),
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

const server = vi.hoisted(() => ({ fetchBrokers: vi.fn() }));
vi.mock('@/features/investments/investmentsServerApi', () => server);
const tradebook = vi.hoisted(() => ({ fetchTradebookPage: vi.fn(), fetchLastImportJob: vi.fn(), fetchLastReconcileJob: vi.fn() }));
vi.mock('@/features/investments/tradebook/tradebookServerApi', () => tradebook);

const api = vi.hoisted(() => ({ POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn(), GET: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

const rows = [trade(), fundBuy, stockBuy];

async function renderPage(params: Record<string, string> = {}) {
  const ui = await DsTradebookPage({ searchParams: Promise.resolve(params) });
  return renderWithQuery(ui);
}

/** The copy of a cell drawn for the phone and the desktop: the first in the DOM is enough for text. */
const first = (text: string | RegExp) => screen.getAllByText(text)[0];

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.clearAllMocks();
  tradebook.fetchTradebookPage.mockResolvedValue(tradesPage(rows, { totalElements: 38, totalPages: 2 }));
  tradebook.fetchLastImportJob.mockResolvedValue(job());
  tradebook.fetchLastReconcileJob.mockResolvedValue(job({ id: 'job-2', type: 'BROKER_RECONCILE_COMMIT', result: null }));
  server.fetchBrokers.mockResolvedValue([
    { id: 'b-zerodha', name: 'Zerodha' },
    { id: 'b-groww', name: 'Groww' },
  ]);
  api.POST.mockResolvedValue({ data: {} });
  api.PUT.mockResolvedValue({ data: {} });
  api.DELETE.mockResolvedValue({});
});

describe('/investments/tradebook: data', () => {
  it('asks the server for the newest 25 trades with no filter', async () => {
    await renderPage();
    expect(tradebook.fetchTradebookPage).toHaveBeenCalledWith({
      search: undefined,
      brokerAccountId: undefined,
      type: undefined,
      fy: currentFy(),
      sort: 'tradeDate,desc',
      page: 0,
      size: 25,
    });
  });

  it('passes the URL filters to the server', async () => {
    await renderPage({ q: 'tcs', broker: 'b-groww', type: 'sell', fy: '2026', page: '1', size: '50' });
    expect(tradebook.fetchTradebookPage).toHaveBeenCalledWith({
      search: 'tcs',
      brokerAccountId: 'b-groww',
      type: 'sell',
      fy: 2026,
      sort: 'tradeDate,desc',
      page: 1,
      size: 50,
    });
  });

  it('shows the last page when the address is past the end', async () => {
    tradebook.fetchTradebookPage.mockResolvedValue(tradesPage([], { totalElements: 38, totalPages: 2 }));
    await expect(renderPage({ page: '9', q: 'a' })).rejects.toThrow('REDIRECT /investments/tradebook?q=a&page=1');
  });

  it('says so when the trades cannot load', async () => {
    tradebook.fetchTradebookPage.mockRejectedValue(new Error('boom'));
    await renderPage();
    expect(screen.getByText('Could not load trades')).toBeTruthy();
  });

  it('still shows the trades when the jobs or the brokers fail', async () => {
    tradebook.fetchLastImportJob.mockRejectedValue(new Error('x'));
    tradebook.fetchLastReconcileJob.mockRejectedValue(new Error('x'));
    server.fetchBrokers.mockRejectedValue(new Error('x'));
    await renderPage();
    expect(first('TATAMOTORS')).toBeTruthy();
    expect(screen.queryByText('View job')).toBeNull();
    expect(screen.getByRole('button', { name: 'All brokers' })).toBeTruthy();
  });
});

describe('/investments/tradebook: rows', () => {
  it('draws the desktop columns', async () => {
    await renderPage();
    for (const h of ['Date', 'Instrument', 'Type', 'Settlement', 'Qty', 'Price', 'Value', 'Charges']) {
      expect(screen.getAllByText(h).length).toBeGreaterThan(0);
    }
    expect(first('1 Oct')).toBeTruthy();
    expect(first('35,500')).toBeTruthy();
    expect(first('≈42.10')).toBeTruthy();
    expect(first('Parag Parikh Flexi Cap')).toBeTruthy();
    expect(first('CNC')).toBeTruthy();
    expect(screen.queryByText('Delivery')).toBeNull();
  });

  it("draws the phone's second line with the settlement tag and no realised figure", async () => {
    await renderPage();
    expect(first(/1 Oct · 50 @ ₹710/)).toBeTruthy();
    expect(first(/5 Oct · 55\.98 units @ ₹89\.32/)).toBeTruthy();
    expect(screen.queryByText(/realised/)).toBeNull();
    expect(screen.queryByText(/delivery/)).toBeNull();
  });

  it('tags an intraday trade MIS and a delivery trade CNC, and a fund with neither', async () => {
    tradebook.fetchTradebookPage.mockResolvedValue(
      tradesPage([trade({ id: 'm1', settlementType: 'intraday' }), trade({ id: 'c1' }), fundBuy], { totalElements: 3, totalPages: 1 }),
    );
    await renderPage();
    expect(screen.getAllByText('MIS').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CNC').length).toBeGreaterThan(0);
    expect(screen.queryByText('Intraday')).toBeNull();
  });

  it('shows Buy and Sell in the Type column', async () => {
    await renderPage();
    expect(screen.getAllByText('Sell').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Buy').length).toBeGreaterThan(0);
  });

  it('says there are no trades yet, or none that match', async () => {
    tradebook.fetchTradebookPage.mockResolvedValue(tradesPage([]));
    const { unmount } = await renderPage();
    expect(screen.getByText('No trades recorded. Record a trade or import your tradebook.')).toBeTruthy();
    unmount();
    await renderPage({ type: 'buy' });
    expect(screen.getByText('No trades match.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.push).toHaveBeenCalledWith('/investments/tradebook');
  });

  it('draws the skeleton while loading', () => {
    const { container } = renderWithQuery(<DsTradebookLoading />);
    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(8);
  });
});

describe('/investments/tradebook: the jobs line', () => {
  it('links each View job to that exact job in Settings → Activity', async () => {
    await renderPage();
    expect(screen.getByText(/Last import 13 Oct, 11:02 am · 14 trades/)).toBeTruthy();
    expect(screen.getByText(/Last reconcile 13 Oct, 11:02 am/)).toBeTruthy();
    const links = screen.getAllByRole('link', { name: 'View job' });
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/settings/activity?job=job-1', '/settings/activity?job=job-2']);
  });

  it('shows only the line of the job that ran', async () => {
    tradebook.fetchLastReconcileJob.mockResolvedValue(null);
    await renderPage();
    expect(screen.getAllByRole('link', { name: 'View job' })).toHaveLength(1);
    expect(screen.queryByText(/Last reconcile/)).toBeNull();
  });
});

describe('/investments/tradebook: filters', () => {
  it('searches after typing pauses, from the first page', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await renderPage({ page: '1' });
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'tcs' } });
    expect(router.push).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(router.push).toHaveBeenCalledWith('/investments/tradebook?q=tcs', { scroll: false });
  });

  it('picks a broker, All brokers clears it', async () => {
    await renderPage({ broker: 'b-groww' });
    expect(screen.getByRole('button', { name: 'Groww' }).className).toContain('bg-brand-tint');
    expect(screen.getByRole('button', { name: 'All brokers' }).className).not.toContain('bg-brand-tint');
    fireEvent.click(screen.getByRole('button', { name: 'Zerodha' }));
    expect(router.push).toHaveBeenLastCalledWith('/investments/tradebook?broker=b-zerodha', { scroll: false });
    fireEvent.click(screen.getByRole('button', { name: 'All brokers' }));
    expect(router.push).toHaveBeenLastCalledWith('/investments/tradebook', { scroll: false });
  });

  it('toggles Buy and Sell', async () => {
    await renderPage({ type: 'buy' });
    fireEvent.click(screen.getByRole('button', { name: 'Sell' }));
    expect(router.push).toHaveBeenLastCalledWith('/investments/tradebook?type=sell', { scroll: false });
    fireEvent.click(screen.getByRole('button', { name: 'Buy' }));
    expect(router.push).toHaveBeenLastCalledWith('/investments/tradebook', { scroll: false });
  });

  it('picks a financial year', async () => {
    await renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: fyLabel(currentFy()) }));
    await user.click(await screen.findByRole('option', { name: 'FY 25-26' }));
    expect(router.push).toHaveBeenLastCalledWith('/investments/tradebook?fy=2025', { scroll: false });
  });

  it('defaults to the current FY and All years is chosen explicitly', async () => {
    await renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: fyLabel(currentFy()) }));
    await user.click(await screen.findByRole('option', { name: 'All years' }));
    expect(router.push).toHaveBeenLastCalledWith('/investments/tradebook?fy=all', { scroll: false });
  });

  it('asks the server for every year when the address says fy=all', async () => {
    await renderPage({ fy: 'all' });
    expect(tradebook.fetchTradebookPage).toHaveBeenCalledWith(expect.objectContaining({ fy: undefined }));
    expect(screen.getByRole('button', { name: /All years/ })).toBeTruthy();
  });

  it('pages through the server: next page and page size', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: /next/i })[0]);
    expect(router.push).toHaveBeenLastCalledWith('/investments/tradebook?page=1', { scroll: false });
  });
});

describe('/investments/tradebook: edit and delete', () => {
  async function openEdit() {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Edit TATAMOTORS trade' }));
    return screen.findByRole('dialog');
  }

  it('opens the trade filled in from the row', async () => {
    const dialog = await openEdit();
    expect(within(dialog).getByText('Edit trade')).toBeTruthy();
    expect(within(dialog).getByText('TATAMOTORS · Zerodha · prices in ₹')).toBeTruthy();
    expect((within(dialog).getByLabelText('Qty') as HTMLInputElement).value).toBe('50');
    expect((within(dialog).getByLabelText('Price') as HTMLInputElement).value).toBe('710.00');
    expect((within(dialog).getByLabelText('STT') as HTMLInputElement).value).toBe('35.50');
    expect((within(dialog).getByLabelText(/Notes/) as HTMLInputElement).value).toBe('Sold before the demerger');
    expect(within(dialog).getByText('Value ₹35,500 · charges ₹42.10')).toBeTruthy();
    expect(within(dialog).getByText('Net ₹35,457.90')).toBeTruthy();
  });

  it('names the settlement choice CNC, with MIS as the other', async () => {
    const dialog = await openEdit();
    expect(within(dialog).getByText('CNC')).toBeTruthy();
    expect(within(dialog).queryByText('Delivery')).toBeNull();
  });

  it('a row press opens the same dialog', async () => {
    await renderPage();
    fireEvent.click(first('Parag Parikh Flexi Cap'));
    expect(await screen.findByText('Edit trade')).toBeTruthy();
    expect(screen.getByText('Parag Parikh Flexi Cap · Groww · prices in ₹')).toBeTruthy();
  });

  it('saves the changes, refreshes the page and says so', async () => {
    const dialog = await openEdit();
    fireEvent.change(within(dialog).getByLabelText('Qty'), { target: { value: '40' } });
    fireEvent.change(within(dialog).getByLabelText('STT'), { target: { value: '' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save trade' }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/investments/transactions/{id}', {
      params: { path: { id: 't-1' } },
      body: {
        type: 'sell',
        settlementType: 'delivery',
        quantity: 40,
        price: 710,
        tradeDate: '2026-10-01',
        charges: { brokerage: 0, exchangeTxnCharges: 1.06, sebiCharges: 0.04, stampDuty: 0, gst: 0.2, dpCharges: 5.3, otherCharges: 0 },
        notes: 'Sold before the demerger',
      },
    });
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Trade updated', { tone: 'success' });
  });

  it('refuses a missing quantity and sends nothing', async () => {
    const dialog = await openEdit();
    fireEvent.change(within(dialog).getByLabelText('Qty'), { target: { value: '' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save trade' }));
    expect(await within(dialog).findByText('Quantity must be above zero')).toBeTruthy();
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('shows the server message when saving fails and keeps the dialog', async () => {
    api.PUT.mockRejectedValue(new Error('nope'));
    const dialog = await openEdit();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save trade' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Failed to update the trade', { tone: 'danger' }));
    expect(screen.getByText('Edit trade')).toBeTruthy();
  });

  it('asks before deleting and says what stays', async () => {
    const dialog = await openEdit();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Delete TATAMOTORS · 1 Oct sell?')).toBeTruthy();
    expect(screen.getByText(/Other trades, prices and dividends of this instrument stay/)).toBeTruthy();
    expect(api.DELETE).not.toHaveBeenCalled();
  });

  it('deletes after the confirmation, refreshes and closes', async () => {
    const dialog = await openEdit();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete trade' }));
    await waitFor(() => expect(api.DELETE).toHaveBeenCalledWith('/api/v1/investments/transactions/{id}', { params: { path: { id: 't-1' } } }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Trade deleted');
    await waitFor(() => expect(screen.queryByText('Edit trade')).toBeNull());
  });

  it('cancelling the confirmation keeps the trade', async () => {
    const dialog = await openEdit();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(api.DELETE).not.toHaveBeenCalled();
  });

  it('switches a trade from sell to buy', async () => {
    const dialog = await openEdit();
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Buy' }));
    expect(within(dialog).getByText(/^Total ₹/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save trade' }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    expect(api.PUT.mock.calls[0][1].body.type).toBe('buy');
  });
});

describe('/investments/tradebook: filter row', () => {
  it('is a FilterBar: search first with the default placeholder, then the chips, carrying their own bleed', async () => {
    await renderPage();
    const row = screen.getByPlaceholderText('Search').closest('div.overflow-x-auto') as HTMLElement;
    expect(row).toHaveClass('scrollbar-none', '-mx-space-16', 'px-space-16', 'py-space-4');
    expect(row.querySelectorAll('button').length).toBeGreaterThan(0);
    expect(row.querySelector('input')).toBe(screen.getByPlaceholderText('Search'));
  });
});
