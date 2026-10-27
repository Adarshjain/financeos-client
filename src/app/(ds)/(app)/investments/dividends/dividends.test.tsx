import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { awaiting, dividend, instrumentTotal, receipts, suggestion, summary, unrecordedCredit } from '@/features/investments/dividends/dividends.fixtures';
import { keys } from '@/lib/query/keys';
import { renderWithQuery } from '@/test/renderWithQuery';

import DsDividendsPage from './page';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
);
vi.mock('next/navigation', () => ({
  redirect,
  useRouter: () => router,
  usePathname: () => '/investments/dividends',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/date-range', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-23',
}));

const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));

const server = vi.hoisted(() => ({
  fetchDividends: vi.fn(),
  fetchDividendSummary: vi.fn(),
  fetchReceiptSummary: vi.fn(),
  fetchByInstrument: vi.fn(),
  fetchSymbolsByReceipt: vi.fn(),
  fetchPositions: vi.fn(),
}));
vi.mock('@/features/investments/dividends/dividendsServerApi', () => server);

const shared = vi.hoisted(() => ({ fetchBrokers: vi.fn(), fetchInstrument: vi.fn() }));
vi.mock('@/features/investments/investmentsServerApi', () => shared);

const actions = vi.hoisted(() => ({
  scanDividendSuggestions: vi.fn(),
  acceptDividendSuggestions: vi.fn(),
  exportDividendsCsv: vi.fn(),
  loadDividendFormOptions: vi.fn(),
}));
vi.mock('@/features/investments/dividends/dividendsActions', () => actions);

const download = vi.hoisted(() => ({ downloadCsv: vi.fn() }));
vi.mock('@/features/investments/downloadCsv', () => download);

const unrecorded = vi.hoisted(() => ({
  state: { items: [] as unknown[], fetched: true, loading: false, isError: false, error: null, scan: vi.fn(), handleRecorded: vi.fn() },
}));
vi.mock('@/features/investments/dividends/useUnrecordedCredits', () => ({ useUnrecordedCredits: () => unrecorded.state }));

vi.mock('@/features/investments/dividends/useDividendReconcile', () => ({
  useDividendReconcile: () => ({
    loading: false,
    fetched: false,
    isError: false,
    items: [],
    meta: null,
    selected: {},
    select: vi.fn(),
    selectedCandidate: vi.fn(),
    tdsOffered: vi.fn(),
    recordTds: vi.fn(),
    setRecordTds: vi.fn(),
    confirmOne: vi.fn(),
    confirmAll: vi.fn(),
    confirmingId: null,
    confirmingAll: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: [{ id: 'a1', name: 'HDFC Savings' }] }) }));

const http = vi.hoisted(() => ({ POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  api: http,
}));
vi.mock('@/features/transactions/TransactionPickerField', () => ({ TransactionPickerField: () => <div data-testid="picker" /> }));

const list = (content = [dividend(), awaiting()], extra: Record<string, unknown> = {}) => ({
  content,
  number: 0,
  size: 25,
  totalElements: content.length,
  totalPages: 1,
  ...extra,
});

async function renderPage(params: Record<string, string> = {}) {
  const ui = await DsDividendsPage({ searchParams: Promise.resolve(params) });
  return renderWithQuery(ui);
}

const IID = '5f0bb705-96f2-4c7e-89d8-88cece3fd79b';
const FILTERS = { brokerAccountId: undefined, type: undefined, instrumentId: undefined, receipt: undefined };

beforeEach(() => {
  vi.clearAllMocks();
  unrecorded.state.items = [];
  server.fetchDividends.mockResolvedValue(list());
  server.fetchDividendSummary.mockResolvedValue(summary());
  server.fetchReceiptSummary.mockResolvedValue(receipts());
  server.fetchByInstrument.mockResolvedValue({ items: [instrumentTotal(), instrumentTotal({ instrumentId: 'i4', symbol: 'INFY', net: 2640 })], page: 0, size: 10, totalElements: 2, totalPages: 1 });
  server.fetchSymbolsByReceipt.mockImplementation(async (_f: unknown, status: string) => (status === 'overdue' ? ['ITC'] : ['TCS']));
  shared.fetchBrokers.mockResolvedValue([{ id: 'b1', name: 'Zerodha' }, { id: 'b2', name: 'Groww' }]);
  shared.fetchInstrument.mockResolvedValue({ id: 'i1', symbol: 'HDFCBANK', name: 'HDFC Bank Ltd' });
  actions.scanDividendSuggestions.mockResolvedValue({ success: true, data: { suggestions: [suggestion(), suggestion({ holdingId: 'h3', symbol: 'INFY', exDate: '2025-10-28', perUnit: 21, qtyHeld: 60, estimatedAmount: 1260 })], scannedSymbols: 4, skippedSymbols: [] } });
  actions.acceptDividendSuggestions.mockResolvedValue({ success: true, data: { created: [{}], skippedCount: 0 } });
  actions.exportDividendsCsv.mockResolvedValue({ success: true, data: { csv: 'a,b', filename: 'dividends-FY26-27.csv' } });
  actions.loadDividendFormOptions.mockResolvedValue({ success: true, data: { brokers: [], positions: [] } });
  http.POST.mockResolvedValue({ data: {} });
  http.PUT.mockResolvedValue({ data: {} });
  http.DELETE.mockResolvedValue({});
});

describe('/investments/dividends: data', () => {
  it('asks for the current FY by default, with every FY in the summary and the by-instrument card over three years', async () => {
    await renderPage();
    expect(server.fetchDividends).toHaveBeenCalledWith({ ...FILTERS, fy: 2026 }, 0, 25);
    expect(server.fetchDividendSummary).toHaveBeenCalledWith({ ...FILTERS, fy: undefined });
    expect(server.fetchReceiptSummary).toHaveBeenCalledWith({ ...FILTERS, fy: 2026 });
    expect(server.fetchByInstrument).toHaveBeenCalledWith(3, 0, 10);
  });

  it('reads every filter, the FY and the page from the address', async () => {
    server.fetchDividends.mockResolvedValue(list([dividend()], { totalElements: 80, totalPages: 2 }));
    await renderPage({ fy: '2025', broker: 'b1', type: 'interest', receipt: 'overdue', instrumentId: IID, page: '1', size: '50' });
    expect(server.fetchDividends).toHaveBeenCalledWith(
      { brokerAccountId: 'b1', type: 'interest', instrumentId: IID, fy: 2025, receipt: 'overdue' },
      1,
      50,
    );
    // The tiles read the whole year: the receipt filter is not sent to the summaries.
    expect(server.fetchReceiptSummary).toHaveBeenCalledWith({ brokerAccountId: 'b1', type: 'interest', instrumentId: IID, fy: 2025, receipt: undefined });
    expect(shared.fetchInstrument).toHaveBeenCalledWith(IID);
  });

  it('asks for no FY at all under All FYs', async () => {
    await renderPage({ fy: 'all' });
    expect(server.fetchDividends).toHaveBeenCalledWith({ ...FILTERS, fy: undefined }, 0, 25);
    expect(screen.getAllByText('Declared').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'All FYs' })).toBeInTheDocument();
  });

  it('shows the last page when the address is past the end', async () => {
    server.fetchDividends.mockResolvedValue(list([], { totalElements: 60, totalPages: 3 }));
    await expect(renderPage({ page: '5' })).rejects.toThrow('REDIRECT /investments/dividends?page=2');
  });

  it('says the list failed and offers Try again', async () => {
    server.fetchDividends.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(screen.getByText('Could not load dividends')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(router.refresh).toHaveBeenCalled();
  });

  it('still shows the list when the figures cannot be read', async () => {
    server.fetchDividendSummary.mockRejectedValue(new Error('x'));
    server.fetchReceiptSummary.mockRejectedValue(new Error('x'));
    server.fetchByInstrument.mockRejectedValue(new Error('x'));
    shared.fetchBrokers.mockRejectedValue(new Error('x'));
    await renderPage();
    expect(screen.getAllByText('HDFCBANK').length).toBeGreaterThan(0);
    // A figure that could not be read says so; it never reads as zero.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText('₹0')).toBeNull();
    expect(screen.queryByText(/^Total net/)).toBeNull();
    expect(screen.queryByText(/claim in ITR/)).toBeNull();
  });

  it('drops an instrument id that is not an id, and reads the names in the same pass', async () => {
    await renderPage({ instrumentId: 'abc; drop' });
    expect(server.fetchDividends).toHaveBeenCalledWith({ ...FILTERS, fy: 2026 }, 0, 25);
    expect(shared.fetchInstrument).not.toHaveBeenCalled();
  });
});

describe('/investments/dividends: figures', () => {
  it('draws the four figures, on the phone and as tiles', async () => {
    await renderPage();
    for (const text of ['₹3,975', '₹1,980', '₹1,460']) expect(screen.getAllByText(text).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('₹370').length).toBeGreaterThan(0);
    expect(screen.getByText('TDS ₹370 · claim in ITR')).toBeInTheDocument();
    expect(screen.getAllByText('5 payouts').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2 matched to bank credits').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ITC overdue · TCS awaiting').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/claim in ITR/).length).toBeGreaterThan(0);
    expect(screen.getByText('Received this FY')).toBeInTheDocument();
    expect(screen.getAllByText('Declared · FY')).toHaveLength(2);
  });

  it('names the instruments of the statuses that have payouts only', async () => {
    await renderPage();
    expect(server.fetchSymbolsByReceipt).toHaveBeenCalledTimes(2);
    expect(server.fetchSymbolsByReceipt).toHaveBeenCalledWith({ ...FILTERS, fy: 2026 }, 'overdue');
    expect(server.fetchSymbolsByReceipt).toHaveBeenCalledWith({ ...FILTERS, fy: 2026 }, 'awaiting');
  });
});

describe('/investments/dividends: the list', () => {
  it('draws a row per payout with plain figures, the receipt word and the total', async () => {
    await renderPage();
    const row = screen.getAllByText('HDFCBANK')[0].closest('[role="button"], tr, div[class*="grid"]') as HTMLElement;
    expect(row).toBeTruthy();
    expect(screen.getAllByText('Received').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Awaiting').length).toBeGreaterThan(0);
    expect(screen.getAllByText('792').length).toBeGreaterThan(0);
    expect(screen.getByText('Total net ₹3,605 · TDS ₹370')).toBeInTheDocument();
    expect(screen.getByText('11 Jul 26')).toBeInTheDocument();
  });

  it('draws the phone line with the units, TDS and account', async () => {
    await renderPage();
    expect(screen.getByText('11 Jul · ₹22 × 40 · TDS ₹88 · HDFC Savings')).toBeInTheDocument();
    expect(screen.getByText(/29 Sep · ₹11 × 10/)).toBeInTheDocument();
  });

  it('shows the Pager above and below with the server totals, and pages through the URL', async () => {
    server.fetchDividends.mockResolvedValue(list([dividend()], { totalElements: 60, totalPages: 3 }));
    await renderPage({ fy: 'all' });
    expect(screen.getAllByText('/ 60').length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getAllByRole('button', { name: /next/i })[0]);
    expect(router.push).toHaveBeenCalledWith('/investments/dividends?fy=all&page=1', { scroll: false });
  });

  it('narrows by receipt status, type and broker, each one URL change back to page 1', async () => {
    await renderPage({ page: '0' });
    fireEvent.click(screen.getByRole('button', { name: 'Receipt status' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Overdue' }));
    expect(router.push).toHaveBeenLastCalledWith('/investments/dividends?receipt=overdue', { scroll: false });

    fireEvent.click(screen.getByRole('button', { name: 'Type' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Interest' }));
    expect(router.push).toHaveBeenLastCalledWith('/investments/dividends?type=interest', { scroll: false });

    fireEvent.click(screen.getByRole('button', { name: 'All brokers' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Groww' }));
    expect(router.push).toHaveBeenLastCalledWith('/investments/dividends?broker=b2', { scroll: false });
  });

  it('changes the FY: another year is in the address, the current one is not, All FYs is "all"', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'FY 26-27' }));
    fireEvent.click(await screen.findByRole('option', { name: 'FY 25-26' }));
    expect(router.push).toHaveBeenLastCalledWith('/investments/dividends?fy=2025', { scroll: false });
  });

  it('shows the instrument the holding page linked to, and the x clears it', async () => {
    await renderPage({ instrumentId: IID });
    expect(screen.getByText('Showing HDFCBANK')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(router.push).toHaveBeenCalledWith('/investments/dividends', { scroll: false });
  });

  it('says what the empty list means: nothing yet, nothing in the FY, nothing matches', async () => {
    server.fetchDividends.mockResolvedValue(list([]));
    const first = await renderPage({ fy: 'all' });
    expect(screen.getByText('No dividends recorded yet.')).toBeInTheDocument();
    first.unmount();

    const second = await renderPage();
    expect(screen.getByText('No dividends in FY 26-27.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show all FYs' }));
    expect(router.push).toHaveBeenLastCalledWith('/investments/dividends?fy=all', { scroll: false });
    second.unmount();

    await renderPage({ receipt: 'overdue' });
    expect(screen.getByText('No dividends match.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.push).toHaveBeenLastCalledWith('/investments/dividends', { scroll: false });
  });

  it('exports the filtered list as CSV', async () => {
    await renderPage({ broker: 'b1' });
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    await waitFor(() => expect(download.downloadCsv).toHaveBeenCalledWith('a,b', 'dividends-FY26-27.csv'));
    expect(actions.exportDividendsCsv).toHaveBeenCalledWith({ brokerAccountId: 'b1', type: undefined, instrumentId: undefined, fy: 2026, receipt: undefined });
  });

  it('says when the export failed', async () => {
    actions.exportDividendsCsv.mockResolvedValue({ success: false, error: { message: 'No access' } });
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('No access', { tone: 'danger' }));
    expect(download.downloadCsv).not.toHaveBeenCalled();
  });
});

describe('/investments/dividends: editing', () => {
  it('opens the edit dialog from the pencil, and from "link a bank credit" on a phone row', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Edit HDFCBANK dividend' }));
    expect(await screen.findByText('Edit dividend')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Edit dividend')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'link a bank credit' }));
    expect(await screen.findByText('Edit dividend')).toBeInTheDocument();
    expect(screen.getByText('TCS · Zerodha')).toBeInTheDocument();
    expect(screen.getByTestId('picker')).toBeInTheDocument();
  });

  it('refreshes the page after a change', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Edit HDFCBANK dividend' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save dividend' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
  });
});

describe('/investments/dividends: unrecorded credits', () => {
  it('shows nothing when there are none', async () => {
    await renderPage();
    expect(screen.queryByText(/look like dividends/)).toBeNull();
  });

  it('names the credits and opens Reconcile', async () => {
    unrecorded.state.items = [unrecordedCredit(), unrecordedCredit({ id: 'tx2', amount: 415, date: '2026-09-19', description: 'NACH CR · NTPC DIV' })];
    await renderPage();
    expect(screen.getByText('2 bank credits look like dividends but are not recorded:')).toBeInTheDocument();
    expect(screen.getByText(/"NACH CR · NTPC DIV" ₹415 on 19 Sep/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reconcile' }));
    expect(await screen.findByText('Receipt matching')).toBeInTheDocument();
    expect(screen.getByText('Unrecorded dividend credits')).toBeInTheDocument();
  });

  it('scans for them when the page opens', async () => {
    await renderPage();
    expect(unrecorded.state.scan).toHaveBeenCalled();
  });
});

describe('/investments/dividends: by instrument', () => {
  it('lists the biggest payers of the last three financial years', async () => {
    await renderPage();
    expect(screen.getByText('By instrument')).toBeInTheDocument();
    expect(screen.getByText('Last 3 financial years')).toBeInTheDocument();
    expect(screen.getByText('₹4,250')).toBeInTheDocument();
    expect(screen.getByText('₹2,640')).toBeInTheDocument();
  });

  it('pages with its own address parameter when there is more than a page', async () => {
    server.fetchByInstrument.mockResolvedValue({ items: [instrumentTotal()], page: 0, size: 10, totalElements: 23, totalPages: 3 });
    await renderPage();
    const card = screen.getByText('By instrument').closest('div[class*="border"]') as HTMLElement;
    fireEvent.click(within(card.parentElement as HTMLElement).getAllByRole('button', { name: /next/i }).at(-1)!);
    expect(router.push).toHaveBeenCalledWith('/investments/dividends?ip=1', { scroll: false });
  });
});

async function pressRescan() {
  fireEvent.click(screen.getByRole('button', { name: 'Rescan' }));
}

describe('/investments/dividends: suggestions', () => {
  it('does not scan on open: the card waits for Rescan', async () => {
    await renderPage();
    expect(screen.getByText('Suggestions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rescan' })).toBeEnabled();
    await act(async () => {});
    expect(actions.scanDividendSuggestions).not.toHaveBeenCalled();
    expect(screen.queryByText('Nothing new found')).toBeNull();
  });

  it('scans once when Rescan is pressed, and lists what was found, with the year on an earlier payout', async () => {
    await renderPage();
    await pressRescan();
    expect(actions.scanDividendSuggestions).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Suggestions · 2')).toBeInTheDocument();
    expect(screen.getByText('Paid on shares you held, not recorded yet')).toBeInTheDocument();
    expect(screen.getByText('TCS · ₹10 / share')).toBeInTheDocument();
    expect(screen.getByText('paid 5 Aug · 10 shares · ₹100')).toBeInTheDocument();
    expect(screen.getByText('paid 28 Oct 25 · 60 shares · ₹1,260')).toBeInTheDocument();
    expect(screen.getByText('Checked 4 symbols.')).toBeInTheDocument();
  });

  it('opens the record form prefilled from the suggestion, so the pay date can be set', async () => {
    await renderPage();
    await pressRescan();
    const row = (await screen.findByText('TCS · ₹10 / share')).closest('div[class*="flex"]') as HTMLElement;
    fireEvent.click(within(row.parentElement!.parentElement as HTMLElement).getAllByRole('button', { name: 'Record' })[0]);
    expect(await screen.findByText('Record dividend', { selector: 'h2, [role="heading"], div' })).toBeInTheDocument();
    expect(actions.acceptDividendSuggestions).not.toHaveBeenCalled();
    expect(await screen.findByLabelText(/^Pay date/)).toHaveValue('05/08/2026');
    expect(screen.getByLabelText(/^Amount/)).toHaveValue('100');
    expect(screen.getByLabelText(/^Per unit/)).toHaveValue('10');
    expect(screen.getByLabelText(/^Notes/)).toHaveValue('Auto-detected dividend (10 units @ ₹10)');
  });

  it('scans once with the broker filter, and no change made on the page scans again', async () => {
    const view = await renderPage({ broker: 'b1' });
    await pressRescan();
    await screen.findByText('Suggestions · 2');
    expect(actions.scanDividendSuggestions).toHaveBeenCalledTimes(1);
    expect(actions.scanDividendSuggestions).toHaveBeenCalledWith('b1');
    // Every investment mutation invalidates the investment queries; the scan is not one of them.
    await act(async () => {
      await view.queryClient.invalidateQueries({ queryKey: keys.investments.all });
      await view.queryClient.invalidateQueries({ queryKey: keys.transactions.all });
    });
    expect(actions.scanDividendSuggestions).toHaveBeenCalledTimes(1);
  });

  it('records them all', async () => {
    await renderPage();
    await pressRescan();
    fireEvent.click(await screen.findByRole('button', { name: 'Record 2' }));
    await waitFor(() => expect(actions.acceptDividendSuggestions).toHaveBeenCalled());
    expect(actions.acceptDividendSuggestions.mock.calls[0][0].items).toHaveLength(2);
  });

  it('says how many were skipped as duplicates', async () => {
    actions.acceptDividendSuggestions.mockResolvedValue({ success: true, data: { created: [{}], skippedCount: 1 } });
    await renderPage();
    await pressRescan();
    fireEvent.click(await screen.findByRole('button', { name: 'Record 2' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Recorded 1 dividend (1 skipped as duplicate)'));
  });

  it('scans again on a second Rescan', async () => {
    await renderPage();
    await pressRescan();
    await screen.findByText('Suggestions · 2');
    fireEvent.click(screen.getByRole('button', { name: 'Rescan' }));
    await waitFor(() => expect(actions.scanDividendSuggestions).toHaveBeenCalledTimes(2));
  });

  it('is always shown: it reads "Nothing new found" when the scan finds nothing', async () => {
    actions.scanDividendSuggestions.mockResolvedValue({ success: true, data: { suggestions: [], scannedSymbols: 1, skippedSymbols: ['XYZ'] } });
    await renderPage();
    await pressRescan();
    expect(await screen.findByText('Nothing new found')).toBeInTheDocument();
    expect(screen.getByText('Suggestions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rescan' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Record \d/ })).toBeNull();
    expect(screen.getByText('Checked 1 symbol. Could not check XYZ.')).toBeInTheDocument();
  });

  it('says the scan failed and offers Rescan', async () => {
    actions.scanDividendSuggestions.mockResolvedValue({ success: false, error: { message: 'x' } });
    await renderPage();
    await pressRescan();
    expect(await screen.findByText('Could not scan for dividends. Try again.')).toBeInTheDocument();
  });

  it('says why a record failed', async () => {
    actions.acceptDividendSuggestions.mockResolvedValue({ success: false, error: { message: 'Not allowed' } });
    await renderPage();
    await pressRescan();
    fireEvent.click(await screen.findByRole('button', { name: 'Record 2' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' }));
  });
});

describe('/investments/dividends: filter row', () => {
  it('is a chips-only FilterBar carrying its own bleed, with no search field', async () => {
    await renderPage();
    const row = screen.getByRole('button', { name: 'Receipt status' }).closest('div.overflow-x-auto') as HTMLElement;
    expect(row).toHaveClass('scrollbar-none', '-mx-space-16', 'px-space-16', 'py-space-4');
    expect(row.querySelector('input')).toBeNull();
  });
});
