import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConcealProvider } from '@/components/ds/Conceal/Conceal';
import { renderWithQuery } from '@/test/renderWithQuery';

import { awaiting, dividend, receipts, summary, unrecordedCredit } from './dividends.fixtures';
import { dividendFilters, dividendListRow, dividendsFigures, fyTotals, parseDividendsUrl } from './dividendsModel';
import { DividendsScreen, type DividendsScreenProps } from './DividendsScreen';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ unstable_rethrow: () => undefined, useRouter: () => router }));

vi.mock('@/lib/date-range', () => ({ todayInAppZone: () => '2026-10-23' }));
vi.mock('@/features/transactions/TransactionPickerField', () => ({ TransactionPickerField: () => <div /> }));
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: [] }) }));

const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));

const actions = vi.hoisted(() => ({
  scanDividendSuggestions: vi.fn(),
  acceptDividendSuggestions: vi.fn(),
  exportDividendsCsv: vi.fn(),
  loadDividendFormOptions: vi.fn(),
}));
vi.mock('./dividendsActions', async (orig) => ({ ...(await orig<typeof import('./dividendsActions')>()), ...actions }));

const scan = vi.hoisted(() => vi.fn());
const unrecorded = vi.hoisted(() => ({ items: [] as unknown[] }));
vi.mock('./useUnrecordedCredits', () => ({
  useUnrecordedCredits: () => ({ items: unrecorded.items, fetched: true, loading: false, isError: false, error: null, scan, handleRecorded: vi.fn() }),
}));

const reconcile = vi.hoisted(() => ({ onLinked: undefined as undefined | (() => void) }));
vi.mock('./useDividendReconcile', () => ({
  useDividendReconcile: (o: { onLinked?: () => void }) => {
    reconcile.onLinked = o.onLinked;
    return { loading: false, fetched: false, isError: false, items: [], meta: null, selected: {}, select: vi.fn(), selectedCandidate: vi.fn(), tdsOffered: vi.fn(), recordTds: vi.fn(), setRecordTds: vi.fn(), confirmOne: vi.fn(), confirmAll: vi.fn(), confirmingId: null, confirmingAll: false, refetch: vi.fn() };
  },
}));

const http = vi.hoisted(() => ({ POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: http }));

const state = parseDividendsUrl({});

function props(dividends = [dividend(), awaiting()]): DividendsScreenProps {
  return {
    state,
    figures: dividendsFigures(2026, fyTotals(summary(), 2026), receipts(), { overdue: ['ITC'] }),
    dividends,
    rows: dividends.map(dividendListRow),
    totalElements: dividends.length,
    totalPages: 1,
    fyOptions: [{ value: 'all', label: 'All FYs' }, { value: '2026', label: 'FY 26-27' }],
    fyValue: '2026',
    currentFy: 2026,
    brokers: [],
    instrumentLabel: null,
    totalsLine: 'Total net ₹3,605 · TDS ₹370',
    exportFilters: dividendFilters(state, 2026),
    byInstrument: { rows: [], page: 0, totalElements: 0, totalPages: 0 },
    today: '2026-10-23',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  unrecorded.items = [];
  actions.scanDividendSuggestions.mockResolvedValue({ success: true, data: { suggestions: [], scannedSymbols: 0, skippedSymbols: [] } });
  http.POST.mockResolvedValue({ data: {} });
  http.PUT.mockResolvedValue({ data: {} });
  http.DELETE.mockResolvedValue({});
});

const openEdit = () => fireEvent.click(screen.getAllByText('HDFCBANK')[0]);

describe('DividendsScreen: the edit dialog', () => {
  it('stays open on the payout it was opened on when a change takes the row out of the filtered list', async () => {
    const view = renderWithQuery(<DividendsScreen {...props()} />);
    openEdit();
    expect(await screen.findByText('Edit dividend')).toBeInTheDocument();
    view.rerender(<DividendsScreen {...props([awaiting()])} />);
    expect(screen.getByText('Edit dividend')).toBeInTheDocument();
    expect(screen.getByText('HDFCBANK · Zerodha')).toBeInTheDocument();
  });

  it('follows the fresh row while the page still lists it', async () => {
    const view = renderWithQuery(<DividendsScreen {...props()} />);
    openEdit();
    await screen.findByText('Edit dividend');
    expect(screen.getByRole('button', { name: 'Unlink' })).toBeInTheDocument();
    view.rerender(<DividendsScreen {...props([dividend({ receiptStatus: 'awaiting', transaction: null }), awaiting()])} />);
    expect(screen.queryByRole('button', { name: 'Unlink' })).toBeNull();
    expect(screen.getByText('Edit dividend')).toBeInTheDocument();
  });
});

describe('DividendsScreen: the unrecorded credits are scanned again after a change', () => {
  it('scans when the page opens', () => {
    renderWithQuery(<DividendsScreen {...props()} />);
    expect(scan).toHaveBeenCalledTimes(1);
  });

  it('after a save', async () => {
    renderWithQuery(<DividendsScreen {...props()} />);
    openEdit();
    fireEvent.click(await screen.findByRole('button', { name: 'Save dividend' }));
    await waitFor(() => expect(scan).toHaveBeenCalledTimes(2));
  });

  it('after an unlink', async () => {
    renderWithQuery(<DividendsScreen {...props()} />);
    openEdit();
    fireEvent.click(await screen.findByRole('button', { name: 'Unlink' }));
    await waitFor(() => expect(scan).toHaveBeenCalledTimes(2));
  });

  it('after a delete', async () => {
    renderWithQuery(<DividendsScreen {...props()} />);
    openEdit();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(scan).toHaveBeenCalledTimes(2));
  });

  it('after matches are confirmed in Reconcile, and the page re-reads', async () => {
    unrecorded.items = [unrecordedCredit()];
    renderWithQuery(<DividendsScreen {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reconcile' }));
    await screen.findByText('Receipt matching');
    scan.mockClear();
    act(() => reconcile.onLinked?.());
    expect(scan).toHaveBeenCalledTimes(1);
    expect(router.refresh).toHaveBeenCalled();
  });
});

describe('DividendsScreen: hidden amounts', () => {
  it('hides every figure of the hero and the tiles, toned ones too', () => {
    renderWithQuery(
      <ConcealProvider concealed>
        <DividendsScreen {...props()} />
      </ConcealProvider>,
    );
    for (const amount of ['₹3,975', '₹1,980', '₹1,460', '₹370']) {
      expect(screen.queryByText(amount)).toBeNull();
    }
    expect(screen.queryByText(/TDS ₹370/)).toBeNull();
    expect(screen.getAllByText('₹ —').length).toBeGreaterThanOrEqual(6);
  });
});

describe('DividendsScreen: the suggestions scan only runs on Rescan', () => {
  it('does not scan on mount, scans once on Rescan, and a broker change goes back to idle without scanning', async () => {
    const view = renderWithQuery(<DividendsScreen {...props()} />);
    await act(async () => {});
    expect(actions.scanDividendSuggestions).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Rescan' }));
    expect(await screen.findByText('No new dividends')).toBeInTheDocument();
    expect(actions.scanDividendSuggestions).toHaveBeenCalledTimes(1);

    view.rerender(<DividendsScreen {...{ ...props(), state: parseDividendsUrl({ broker: 'b2' }) }} />);
    await act(async () => {});
    expect(screen.queryByText('No new dividends')).toBeNull();
    expect(actions.scanDividendSuggestions).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Rescan' }));
    await waitFor(() => expect(actions.scanDividendSuggestions).toHaveBeenCalledTimes(2));
    expect(actions.scanDividendSuggestions).toHaveBeenLastCalledWith('b2');
  });
});
