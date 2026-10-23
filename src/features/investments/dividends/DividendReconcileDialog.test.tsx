import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DividendReconcileDialog } from './DividendReconcileDialog';
import { dividend, unrecordedCredit } from './dividends.fixtures';
import type { DividendMatchItem } from './receiptTypes';

vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: [{ id: 'a1', name: 'HDFC Savings' }] }) }));

const reconcile = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  notify: undefined as undefined | ((m: string, t?: 'danger') => void),
  onLinked: undefined as undefined | (() => void),
}));
vi.mock('./useDividendReconcile', () => ({
  useDividendReconcile: (opts: { notify?: (m: string, t?: 'danger') => void; onLinked?: () => void }) => {
    reconcile.notify = opts.notify;
    reconcile.onLinked = opts.onLinked;
    return reconcile.state;
  },
}));

const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));

const candidate = (id: string, impliedTds: number | null = null) => ({
  tier: 'NET_OF_TDS',
  reasons: ['NET_OF_10PCT_TDS', 'NAME_MATCH'],
  impliedTds,
  transaction: { id, accountId: 'a1', date: '2026-07-11', amount: 792, description: `Credit ${id}` },
});

const item = (candidates = [candidate('c1', 88)]) => ({ dividend: dividend({ tds: undefined, transaction: null, receiptStatus: 'awaiting' }), candidates }) as unknown as DividendMatchItem;

function setReconcile(over: Record<string, unknown> = {}) {
  const fns = {
    select: vi.fn(),
    setRecordTds: vi.fn(),
    confirmOne: vi.fn(),
    confirmAll: vi.fn(),
    refetch: vi.fn(),
  };
  reconcile.state = {
    loading: false,
    fetched: true,
    isError: false,
    items: [item()],
    meta: { coverageEnd: '2026-10-13', unresolvedCount: 1, withCandidates: 1 },
    selected: { d1: 'c1' },
    selectedCandidate: (i: DividendMatchItem) => i.candidates[0],
    tdsOffered: () => true,
    recordTds: () => true,
    confirmingId: null,
    confirmingAll: false,
    ...fns,
    ...over,
  };
  return fns;
}

const unrecorded = (over: Record<string, unknown> = {}) =>
  ({ items: [], fetched: true, loading: false, isError: false, error: null, scan: vi.fn(), handleRecorded: vi.fn(), ...over }) as never;

function open(props: Partial<React.ComponentProps<typeof DividendReconcileDialog>> = {}) {
  const handlers = { onRecord: vi.fn(), onChanged: vi.fn(), onClose: vi.fn() };
  render(<DividendReconcileDialog unrecorded={unrecorded()} today="2026-10-23" {...handlers} {...props} />);
  return handlers;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DividendReconcileDialog: receipt matching', () => {
  it('shows each unmatched dividend with its credit, why it matches, and the TDS it implies', () => {
    setReconcile();
    open();
    expect(screen.getByText('Reconcile')).toBeInTheDocument();
    expect(screen.getByText('HDFCBANK · Zerodha')).toBeInTheDocument();
    expect(screen.getByText('₹880 · 10 Jul')).toBeInTheDocument();
    expect(screen.getByText('Credit c1 · HDFC Savings · 11 Jul · +₹792')).toBeInTheDocument();
    expect(screen.getByText('Net of TDS · Net of 10% TDS · Names the company')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByText('Record TDS ₹88')).toBeInTheDocument();
    expect(screen.getByText('1 unmatched dividend · 1 with candidates · Bank data through 13 Oct')).toBeInTheDocument();
  });

  it('lets the TDS be left out', () => {
    const fns = setReconcile();
    open();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(fns.setRecordTds).toHaveBeenCalledWith('d1', false);
  });

  it('confirms one, confirms all, and finds matches', () => {
    const fns = setReconcile();
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(fns.confirmOne).toHaveBeenCalledWith('d1');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm all' }));
    expect(fns.confirmAll).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Find matches' }));
    expect(fns.refetch).toHaveBeenCalled();
  });

  it('cannot confirm until a credit is chosen', () => {
    setReconcile({ selected: {} });
    open();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('asks to find matches before the first search', () => {
    setReconcile({ fetched: false, items: [], meta: null });
    open();
    expect(screen.getByText(/Find matches looks for bank credits/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm all' })).toBeNull();
  });

  it('says nothing matched, and that the bank data is stale when it is', () => {
    setReconcile({ items: [], meta: { coverageEnd: '2026-08-01', unresolvedCount: 2, withCandidates: 0 } });
    open();
    expect(screen.getByText('No bank credits match your unmatched dividends.')).toBeInTheDocument();
    expect(screen.getByText('Your bank data stops at 1 Aug. Import a newer statement.')).toBeInTheDocument();
  });

  it('says the search failed', () => {
    setReconcile({ isError: true, items: [], meta: null });
    open();
    expect(screen.getByText('Could not load matches. Try again.')).toBeInTheDocument();
  });

  it('reports results through the Dinero toaster', () => {
    setReconcile();
    open();
    reconcile.notify?.('Linked 1 of 1');
    reconcile.notify?.('Skipped', 'danger');
    expect(showToast).toHaveBeenCalledWith('Linked 1 of 1', undefined);
    expect(showToast).toHaveBeenCalledWith('Skipped', { tone: 'danger' });
  });
});

describe('DividendReconcileDialog: after a match', () => {
  it('asks the page to re-read once matches are linked', () => {
    setReconcile();
    const { onChanged } = open();
    reconcile.onLinked?.();
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});

describe('DividendReconcileDialog: unrecorded credits', () => {
  it('lists each credit and records it for the holdings that could have paid it', () => {
    setReconcile({ items: [], meta: null, fetched: false });
    const hint = { holdingId: 'h1', brokerAccountId: 'b1', instrumentId: 'i1', symbol: 'COALINDIA', instrumentName: 'Coal India', brokerName: 'Zerodha', nameScore: 1 };
    const { onRecord } = open({ unrecorded: unrecorded({ items: [unrecordedCredit({}, [hint]), unrecordedCredit({ id: 'tx2', amount: 415, description: 'NACH CR · NTPC DIV' })] }) });
    expect(screen.getByText('ACH CR · COAL INDIA LTD')).toBeInTheDocument();
    expect(screen.getAllByText('HDFC Savings · 24 Sep')).toHaveLength(2);
    expect(screen.getByText('+₹1,020')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Record for COALINDIA · Zerodha' }));
    expect(onRecord).toHaveBeenCalledWith({ amount: 1020, payDate: '2026-09-24', linkTransactionId: 'tx1', brokerAccountId: 'b1', instrumentId: 'i1' });
    fireEvent.click(screen.getByRole('button', { name: 'Record dividend' }));
    expect(onRecord).toHaveBeenLastCalledWith({ amount: 415, payDate: '2026-09-24', linkTransactionId: 'tx2', brokerAccountId: undefined, instrumentId: undefined });
  });

  it('scans again, and says when there are none or the scan failed', () => {
    setReconcile({ items: [], meta: null });
    const scan = vi.fn();
    open({ unrecorded: unrecorded({ scan }) });
    expect(screen.getByText('No unrecorded dividend-like credits in the last year.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Scan bank credits' }));
    expect(scan).toHaveBeenCalled();
  });

  it('says the credits could not be loaded', () => {
    setReconcile({ items: [], meta: null });
    open({ unrecorded: unrecorded({ isError: true }) });
    expect(screen.getByText('Could not load credits. Try again.')).toBeInTheDocument();
  });

  it('closes', () => {
    setReconcile();
    const { onClose } = open();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(onClose).toHaveBeenCalled();
  });
});
