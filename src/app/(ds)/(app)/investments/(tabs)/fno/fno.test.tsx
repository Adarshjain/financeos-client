import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConcealProvider } from '@/components/ds';
import { brokers, fnoPage, summary, trades } from '@/features/investments/fno/fno.fixtures';
import { FnoAddDialog } from '@/features/investments/fno/FnoAddDialog';
import { FNO_HREF } from '@/features/investments/fno/fnoModel';
import { renderWithQuery } from '@/test/renderWithQuery';

import DsFnoPage from './page';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
);
vi.mock('next/navigation', () => ({
  redirect,
  useRouter: () => router,
  usePathname: () => '/investments/fno',
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

const server = vi.hoisted(() => ({ fetchFnoPage: vi.fn(), fetchFnoSummary: vi.fn(), fetchFnoCsv: vi.fn() }));
vi.mock('@/features/investments/fno/fnoServerApi', () => server);
const shared = vi.hoisted(() => ({ fetchBrokers: vi.fn() }));
vi.mock('@/features/investments/investmentsServerApi', () => shared);

const exportAction = vi.hoisted(() => vi.fn());
vi.mock('@/features/investments/fno/fnoActions', () => ({ exportFnoCsv: exportAction }));
const download = vi.hoisted(() => vi.fn());
vi.mock('@/features/investments/downloadCsv', () => ({ downloadCsv: download }));

const api = vi.hoisted(() => ({ POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn(), GET: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

async function renderPage(params: Record<string, string> = {}) {
  const ui = await DsFnoPage({ searchParams: Promise.resolve(params) });
  return renderWithQuery(ui);
}

/** The copy of a figure drawn once for the phone and once for the desktop: jsdom shows both. */
const some = (text: string | RegExp) => screen.getAllByText(text)[0];

beforeEach(() => {
  vi.clearAllMocks();
  server.fetchFnoPage.mockResolvedValue(fnoPage());
  server.fetchFnoSummary.mockResolvedValue(summary);
  shared.fetchBrokers.mockResolvedValue(brokers);
  exportAction.mockResolvedValue({ success: true, data: { csv: 'a,b', filename: 'fno-2026-27.csv' } });
  api.POST.mockResolvedValue({ data: trades[0] });
  api.PUT.mockResolvedValue({ data: trades[0] });
  api.DELETE.mockResolvedValue({});
});

describe('/investments/fno: data', () => {
  it('asks the server for the current year, newest first, 25 a page, with the year summary', async () => {
    await renderPage();
    expect(server.fetchFnoPage).toHaveBeenCalledWith({
      fy: 2026,
      optionType: undefined,
      brokerAccountId: undefined,
      search: undefined,
      sort: 'newest',
      page: 0,
      size: 25,
    });
    expect(server.fetchFnoSummary).toHaveBeenCalledWith({ fy: 2026, brokerAccountId: undefined });
    expect(server.fetchFnoPage).toHaveBeenCalledTimes(1);
  });

  it('passes the filters, year, sort and page from the URL to the server', async () => {
    server.fetchFnoPage.mockResolvedValue(fnoPage(trades, { totalElements: 60, totalPages: 3 }));
    await renderPage({ q: 'nifty', contract: 'CE', broker: 'b1', fy: '2025', sort: 'pnl_desc', page: '2', size: '25' });
    expect(server.fetchFnoPage).toHaveBeenCalledWith({
      fy: 2025,
      optionType: 'CE',
      brokerAccountId: 'b1',
      search: 'nifty',
      sort: 'pnl_desc',
      page: 1,
      size: 25,
    });
    expect(server.fetchFnoSummary).toHaveBeenCalledWith({ fy: 2025, brokerAccountId: 'b1' });
  });

  it('shows the last page when the address is past the end', async () => {
    server.fetchFnoPage.mockResolvedValue(fnoPage([], { totalElements: 30, totalPages: 2 }));
    await expect(renderPage({ page: '6' })).rejects.toThrow(`REDIRECT ${FNO_HREF}?page=2`);
  });

  it('says so when the trades could not load', async () => {
    server.fetchFnoPage.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.getByText("Couldn't load F&O trades")).toBeInTheDocument();
  });

  it('keeps the list when only the summary fails: tiles say so, the cards are gone', async () => {
    server.fetchFnoSummary.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.getAllByText("Couldn't load this figure. Try again.")).toHaveLength(3);
    expect(screen.getAllByText('RELIANCE 3000 CE').length).toBeGreaterThan(0);
    expect(screen.queryByText('P&L by month')).toBeNull();
    expect(screen.queryByText(/taxed as business income/)).toBeNull();
  });
});

describe('/investments/fno: page', () => {
  it('shows the year figures, the trades and the two cards', async () => {
    await renderPage();
    expect(some('+₹10,456')).toBeInTheDocument();
    expect(some('4 trades')).toBeInTheDocument();
    expect(some('50%')).toBeInTheDocument();
    expect(some('2 of 4')).toBeInTheDocument();
    expect(some('₹669')).toBeInTheDocument();
    for (const name of ['RELIANCE 3000 CE', 'NIFTY 25200 CE', 'NIFTY OCT FUT', 'BANKNIFTY 56000 PE']) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
    expect(screen.getByText('P&L by month')).toBeInTheDocument();
    expect(screen.getByText('September')).toBeInTheDocument();
    expect(screen.getByText('By underlying')).toBeInTheDocument();
    expect(screen.getByText('Realised +₹10,456 · taxed as business income')).toBeInTheDocument();
  });

  it('has no Import statement button in the tab (the top bar + menu holds it)', async () => {
    await renderPage();
    expect(screen.queryByRole('link', { name: 'Import statement' })).toBeNull();
  });

  it('turns every filter into one URL change that resets the page', async () => {
    await renderPage({ page: '1' });
    fireEvent.click(screen.getByRole('button', { name: 'PE' }));
    expect(router.push).toHaveBeenLastCalledWith(`${FNO_HREF}?contract=PE`, { scroll: false });
    fireEvent.click(screen.getByRole('button', { name: 'Futures' }));
    expect(router.push).toHaveBeenLastCalledWith(`${FNO_HREF}?contract=FUT`, { scroll: false });
  });

  it('searches by underlying after typing pauses', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await renderPage();
      fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'NIFTY' } });
      expect(router.push).not.toHaveBeenCalled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });
      expect(router.push).toHaveBeenLastCalledWith(`${FNO_HREF}?q=NIFTY`, { scroll: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it('offers an Options chip for every option, besides CE and PE', async () => {
    await renderPage({ contract: 'OPT' });
    expect(server.fetchFnoPage).toHaveBeenCalledWith(expect.objectContaining({ optionType: 'OPT' }));
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    expect(router.push).toHaveBeenLastCalledWith(`${FNO_HREF}?contract=OPT`, { scroll: false });
  });

  it('hides every amount when amounts are hidden', async () => {
    const ui = await DsFnoPage({ searchParams: Promise.resolve({}) });
    const { container } = renderWithQuery(<ConcealProvider concealed>{ui}</ConcealProvider>);
    expect(container.textContent).not.toMatch(/10,456|669|6,266|16,366|4,571/);
    expect(container.textContent).toContain('₹ —');
  });

  it('picks the year and the sort from their menus', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /FY 26-27/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'FY 25-26' }));
    expect(router.push).toHaveBeenLastCalledWith(`${FNO_HREF}?fy=2025`, { scroll: false });
    fireEvent.click(screen.getByRole('button', { name: /Newest/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'Highest P&L' }));
    expect(router.push).toHaveBeenLastCalledWith(`${FNO_HREF}?sort=pnl_desc`, { scroll: false });
  });

  it('picks a broker', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Broker' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Zerodha' }));
    expect(router.push).toHaveBeenLastCalledWith(`${FNO_HREF}?broker=b1`, { scroll: false });
  });

  it('says when nothing matches and clears the filters', async () => {
    server.fetchFnoPage.mockResolvedValue(fnoPage([]));
    await renderPage({ contract: 'PE', q: 'XYZ' });
    expect(screen.getByText('No trades match')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.push).toHaveBeenLastCalledWith(FNO_HREF);
  });

  it('says when the year has no trades and offers no clear-filters', async () => {
    server.fetchFnoPage.mockResolvedValue(fnoPage([]));
    await renderPage();
    expect(screen.getByText(/No F&O trades in FY 26-27/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Export for ITR' })).toBeNull();
  });

  it('exports the year as a CSV for the ITR', async () => {
    await renderPage({ fy: '2025' });
    fireEvent.click(screen.getByRole('button', { name: 'Export for ITR' }));
    await waitFor(() => expect(download).toHaveBeenCalledWith('a,b', 'fno-2026-27.csv'));
    expect(exportAction).toHaveBeenCalledWith(2025);
  });

  it('reports a failed export in a toast and downloads nothing', async () => {
    exportAction.mockResolvedValue({ success: false, error: { message: 'Export failed' } });
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Export for ITR' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Export failed', { tone: 'danger' }));
    expect(download).not.toHaveBeenCalled();
  });
});

describe('/investments/fno: edit and delete', () => {
  it('opens a trade from its row with the form filled and the net worked out', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit NIFTY 25200 CE' })[0]);
    const dialog = await screen.findByRole('dialog', { name: /Edit F&O trade/ });
    expect(within(dialog).getByLabelText('Trading symbol')).toHaveValue('NIFTY26OCT25200CE');
    expect(within(dialog).getByLabelText('Underlying')).toHaveValue('NIFTY');
    expect(within(dialog).getByLabelText('Strike')).toHaveValue('25200');
    expect(within(dialog).getByDisplayValue('22/10/2026')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('01/10/2026')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('04/10/2026')).toBeInTheDocument();
    expect(within(dialog).getByText('Gross +₹5,625 · charges ₹96.40')).toBeInTheDocument();
    expect(within(dialog).getByText('Net +₹5,528.60')).toBeInTheDocument();
  });

  it('saves the changes with a PUT, keeps the notes, refreshes and toasts', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit NIFTY 25200 CE' })[0]);
    const dialog = await screen.findByRole('dialog', { name: /Edit F&O trade/ });
    fireEvent.change(within(dialog).getByLabelText('Sell value'), { target: { value: '17000' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save trade' }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/investments/fno/{id}', {
      params: { path: { id: 't-nifty-ce' } },
      body: expect.objectContaining({
        brokerAccountId: 'b1',
        tradingSymbol: 'NIFTY26OCT25200CE',
        contractType: 'option',
        optionType: 'CE',
        strikePrice: 25200,
        sellValue: 17000,
        buyValue: 11250,
        quantity: 75,
        notes: 'Expiry week',
      }),
    });
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('F&O trade updated');
  });

  it('refuses a form that is not valid and sends nothing', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit NIFTY 25200 CE' })[0]);
    const dialog = await screen.findByRole('dialog', { name: /Edit F&O trade/ });
    fireEvent.change(within(dialog).getByLabelText('Qty / lot size'), { target: { value: '0' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save trade' }));
    expect(await within(dialog).findByText('Enter a quantity above zero.')).toBeInTheDocument();
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('keeps the form open and toasts when the server refuses', async () => {
    api.PUT.mockRejectedValue(new Error('no'));
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit NIFTY 25200 CE' })[0]);
    const dialog = await screen.findByRole('dialog', { name: /Edit F&O trade/ });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save trade' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Couldn't save the F&O trade. Try again.", { tone: 'danger' }));
    expect(screen.getByRole('dialog', { name: /Edit F&O trade/ })).toBeInTheDocument();
  });

  it('confirms before deleting, says what goes and what stays, then deletes', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit NIFTY 25200 CE' })[0]);
    const form = await screen.findByRole('dialog', { name: /Edit F&O trade/ });
    fireEvent.click(within(form).getByRole('button', { name: 'Delete' }));
    const confirm = await screen.findByRole('dialog', { name: 'Delete F&O trade?' });
    expect(within(confirm).getByText('The trade for NIFTY26OCT25200CE goes.')).toBeInTheDocument();
    expect(within(confirm).getByText('Only this trade is deleted.')).toBeInTheDocument();
    expect(within(confirm).getByText('Your other trades stay.')).toBeInTheDocument();
    expect(api.DELETE).not.toHaveBeenCalled();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete trade' }));
    await waitFor(() => expect(api.DELETE).toHaveBeenCalled());
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/investments/fno/{id}', { params: { path: { id: 't-nifty-ce' } } });
    await waitFor(() => expect(toast).toHaveBeenCalledWith('F&O trade deleted'));
    expect(router.refresh).toHaveBeenCalled();
  });

  it('leaves the trade alone when the confirmation is cancelled', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit NIFTY 25200 CE' })[0]);
    const form = await screen.findByRole('dialog', { name: /Edit F&O trade/ });
    fireEvent.click(within(form).getByRole('button', { name: 'Delete' }));
    const confirm = await screen.findByRole('dialog', { name: 'Delete F&O trade?' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(api.DELETE).not.toHaveBeenCalled();
  });
});

describe('F&O add form (the top bar +)', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    api.GET.mockResolvedValue({
      data: [
        { id: 'b1', type: 'broker', name: 'Zerodha', clientId: 'ZQ4471' },
        { id: 'bank', type: 'bank_account', name: 'HDFC Savings' },
      ],
    });
  });

  it('opens an empty form on the first broker, with no Delete', async () => {
    renderWithQuery(<FnoAddDialog onClose={onClose} />);
    const dialog = await screen.findByRole('dialog', { name: 'Record F&O trade' });
    expect(within(dialog).getByText('Zerodha · ZQ4471')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(within(dialog).getByLabelText('Option type')).toBeInTheDocument();
  });

  it('hides the option type and strike for a future', async () => {
    renderWithQuery(<FnoAddDialog onClose={onClose} />);
    const dialog = await screen.findByRole('dialog', { name: 'Record F&O trade' });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Futures' }));
    expect(within(dialog).queryByLabelText('Option type')).toBeNull();
    expect(within(dialog).queryByLabelText('Strike')).toBeNull();
  });

  it('records a trade with a POST, then refreshes, toasts and closes', async () => {
    renderWithQuery(<FnoAddDialog onClose={onClose} />);
    const dialog = await screen.findByRole('dialog', { name: 'Record F&O trade' });
    fireEvent.change(within(dialog).getByLabelText('Trading symbol'), { target: { value: 'nifty26octfut' } });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Futures' }));
    fireEvent.change(within(dialog).getByLabelText('Qty / lot size'), { target: { value: '75' } });
    fireEvent.change(within(dialog).getByLabelText('Buy value'), { target: { value: '1891500' } });
    fireEvent.change(within(dialog).getByLabelText('Sell value'), { target: { value: '1902750' } });
    fireEvent.change(within(dialog).getByLabelText('Total charges'), { target: { value: '412.6' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Record trade' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/investments/fno', {
      body: expect.objectContaining({
        brokerAccountId: 'b1',
        tradingSymbol: 'NIFTY26OCTFUT',
        contractType: 'future',
        quantity: 75,
        buyValue: 1891500,
        sellValue: 1902750,
        totalCharges: 412.6,
      }),
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(router.refresh).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('F&O trade recorded');
  });

  it('starts the entry date on today and refuses an exit before it, as a field error', async () => {
    renderWithQuery(<FnoAddDialog onClose={onClose} />);
    const dialog = await screen.findByRole('dialog', { name: 'Record F&O trade' });
    expect(within(dialog).getByLabelText('Entry date')).toHaveValue('13/10/2026');
    fireEvent.change(within(dialog).getByLabelText('Exit date'), { target: { value: '12/10/2026' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Record trade' }));
    expect(await within(dialog).findByText('The exit date cannot be before the entry date.')).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('closes without saving on Cancel', async () => {
    renderWithQuery(<FnoAddDialog onClose={onClose} />);
    const dialog = await screen.findByRole('dialog', { name: 'Record F&O trade' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(api.POST).not.toHaveBeenCalled();
  });
});

describe('/investments/fno: filter row', () => {
  it('is a FilterBar: search first with the default placeholder, then the chips, carrying their own bleed', async () => {
    await renderPage();
    const row = screen.getByPlaceholderText('Search').closest('div.overflow-x-auto') as HTMLElement;
    expect(row).toHaveClass('scrollbar-none', '-mx-space-16', 'px-space-16', 'py-space-4');
    expect(row.querySelectorAll('button').length).toBeGreaterThan(0);
    expect(row.querySelector('input')).toBe(screen.getByPlaceholderText('Search'));
  });
});
