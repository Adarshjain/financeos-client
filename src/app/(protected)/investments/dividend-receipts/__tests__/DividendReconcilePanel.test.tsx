import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/ui/select', async () => (await import('@/test/mockSelect')).selectMock);

import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { AccountType } from '@/lib/types';
import { formatDate, toCalendarDate } from '@/lib/utils';
import { renderWithQuery } from '@/test/renderWithQuery';

import { DividendReconcilePanel } from '../DividendReconcilePanel';
import type { DividendMatchItem, MatchReason } from '../types';
import { makeCandidate, makeDividend, makeTxn } from './fixtures';

const accounts: Account[] = [{ id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT }];
const CONFIRM = '/api/v1/investments/dividends/reconciliation/confirm';

function route(items: DividendMatchItem[], extra: { coverageEnd?: string | null; unresolvedCount?: number } = {}) {
  vi.mocked(api.GET).mockImplementation((path: unknown) => {
    if (path === '/api/v1/accounts') return Promise.resolve({ data: accounts } as never);
    if (path === '/api/v1/investments/dividends/reconciliation') {
      return Promise.resolve({
        data: {
          items,
          coverageEnd: extra.coverageEnd ?? null,
          unresolvedCount: extra.unresolvedCount ?? items.length,
          withCandidates: items.length,
        },
      } as never);
    }
    return Promise.resolve({ data: { items: [], from: '', to: '' } } as never);
  });
}

function renderPanel() {
  return renderWithQuery(<DividendReconcilePanel brokerAccounts={[]} positions={[]} />);
}

async function findMatches() {
  fireEvent.click(screen.getByRole('button', { name: /Find matches/i }));
}

const single: DividendMatchItem = {
  dividend: makeDividend({ id: 'd1', amount: 1000, tds: 100 }),
  candidates: [
    makeCandidate({
      transaction: makeTxn({ id: 'tx-1', description: 'INFY DIV CREDIT', amount: 900 }),
      tier: 'NET_OF_TDS',
      reasons: ['NET_OF_RECORDED_TDS', 'DIVIDEND_KEYWORD'],
    }),
  ],
};

describe('DividendReconcilePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route([]);
  });

  it('shows the header, caption and the pre-fetch hint', () => {
    renderPanel();
    expect(screen.getByText('Receipt matching')).toBeInTheDocument();
    expect(screen.getByText('Bank credits that look like your unmatched dividends')).toBeInTheDocument();
    expect(screen.getByText(/Click .*Find matches.* to look for bank credits/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirm all/i })).not.toBeInTheDocument();
    expect(api.GET).not.toHaveBeenCalledWith('/api/v1/investments/dividends/reconciliation', expect.anything());
  });

  it('renders the row: symbol, broker, expected net, date, badge, candidate summary and footer', async () => {
    route([single], { coverageEnd: '2026-03-31', unresolvedCount: 4 });
    renderPanel();
    await findMatches();

    const row = (await screen.findByText('INFY')).closest('div.p-3') as HTMLElement;
    expect(within(row).getByText('Zerodha')).toBeInTheDocument();
    expect(within(row).getByText('₹900.00')).toBeInTheDocument();
    expect(within(row).getByText(formatDate('2026-02-20'))).toBeInTheDocument(); // exDate wins
    expect(within(row).getByText('Overdue')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(row).getByText(`INFY DIV CREDIT · HDFC Savings · ${formatDate('2026-03-10')} · +₹900.00`),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(`4 unmatched dividends · 1 with candidates · Bank data through ${formatDate('2026-03-31')}`),
    ).toBeInTheDocument();
  });

  it('falls back to payDate when there is no exDate and to instrument name without a symbol', async () => {
    route([{ ...single, dividend: makeDividend({ id: 'd9', exDate: undefined, symbol: '', payDate: '2026-03-08' }) }]);
    renderPanel();
    await findMatches();
    expect(await screen.findByText('Infosys Limited')).toBeInTheDocument();
    expect(screen.getByText(formatDate('2026-03-08'))).toBeInTheDocument();
  });

  it('humanizes every reason chip and styles the split suspect amber', async () => {
    const all: MatchReason[] = [
      'EXACT_GROSS',
      'NET_OF_RECORDED_TDS',
      'NET_OF_10PCT_TDS',
      'AMOUNT_WITHIN_BAND',
      'SPLIT_RATIO_SUSPECT',
      'DIVIDEND_KEYWORD',
      'NAME_MATCH',
      'SYMBOL_MATCH',
    ];
    route([{ ...single, candidates: [makeCandidate({ reasons: all })] }]);
    renderPanel();
    await findMatches();

    for (const label of [
      'Exact amount',
      'Net of recorded TDS',
      'Net of 10% TDS',
      'Amount in range',
      'Says dividend',
      'Names the company',
      'Mentions ticker',
    ]) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('Split multiple? check expected amount')).toHaveClass('text-amber-700');
    expect(screen.getByText('Exact amount')).not.toHaveClass('text-amber-700');
  });

  it.each([
    ['EXACT', 'Exact', 'text-emerald-600'],
    ['NET_OF_TDS', 'Net of TDS', 'text-sky-600'],
    ['FUZZY', 'Fuzzy', 'text-slate-500'],
  ] as const)('labels tier %s', async (tier, label, cls) => {
    route([{ ...single, candidates: [makeCandidate({ tier })] }]);
    renderPanel();
    await findMatches();
    expect(await screen.findByText(label)).toHaveClass(cls);
  });

  it('single candidate: no select; multi candidate: a select defaulting to the best and switchable', async () => {
    route([single]);
    const first = renderPanel();
    await findMatches();
    await screen.findByText('INFY');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    first.unmount();

    const multi: DividendMatchItem = {
      dividend: makeDividend({ id: 'd1' }),
      candidates: [
        makeCandidate({ transaction: makeTxn({ id: 'tx-a', description: 'Credit A' }), tier: 'EXACT' }),
        makeCandidate({ transaction: makeTxn({ id: 'tx-b', description: 'Credit B' }), tier: 'FUZZY' }),
      ],
    };
    route([multi]);
    renderPanel();
    await findMatches();
    await screen.findByRole('combobox');
    expect(screen.getByTestId('select')).toHaveAttribute('data-value', 'tx-a');
    expect(screen.getByText('Exact')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: /Credit B/ }));
    expect(screen.getByTestId('select')).toHaveAttribute('data-value', 'tx-b');
    expect(screen.getByText('Fuzzy')).toBeInTheDocument();

    vi.mocked(api.POST).mockResolvedValue({ data: { linked: [makeDividend()], skipped: [] } } as never);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith(CONFIRM, {
        body: { items: [{ dividendId: 'd1', transactionId: 'tx-b', updateTds: false }] },
      }),
    );
  });

  it('offers a TDS checkbox (default checked) only when implied TDS and no recorded TDS; its state is sent', async () => {
    const withTds: DividendMatchItem = {
      dividend: makeDividend({ id: 'd1', amount: 1000 }),
      candidates: [makeCandidate({ transaction: makeTxn({ id: 'tx-a' }), impliedTds: 100, tier: 'NET_OF_TDS' })],
    };
    route([withTds]);
    renderPanel();
    await findMatches();

    const box = await screen.findByRole('checkbox', { name: 'Record TDS ₹100.00' });
    expect(box).toBeChecked();
    fireEvent.click(box);
    expect(box).not.toBeChecked();

    vi.mocked(api.POST).mockResolvedValue({ data: { linked: [makeDividend()], skipped: [] } } as never);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith(CONFIRM, {
        body: { items: [{ dividendId: 'd1', transactionId: 'tx-a', updateTds: false }] },
      }),
    );
  });

  it('hides the TDS checkbox when TDS is already recorded or nothing is implied', async () => {
    route([
      { ...single, candidates: [makeCandidate({ impliedTds: 100 })] }, // single has tds 100 recorded
    ]);
    renderPanel();
    await findMatches();
    await screen.findByText('INFY');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('Confirm all posts every row in one request; Confirm buttons disable while it is in flight', async () => {
    const second: DividendMatchItem = {
      dividend: makeDividend({ id: 'd2', symbol: 'TCS' }),
      candidates: [makeCandidate({ transaction: makeTxn({ id: 'tx-z' }) })],
    };
    route([single, second]);
    let resolve: (v: unknown) => void = () => {};
    vi.mocked(api.POST).mockReturnValue(new Promise((r) => (resolve = r)) as never);
    renderPanel();
    await findMatches();
    await screen.findByText('TCS');

    fireEvent.click(screen.getByRole('button', { name: /Confirm all/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Confirming/i })).toBeDisabled());
    screen.getAllByRole('button', { name: 'Confirm' }).forEach((b) => expect(b).toBeDisabled());
    expect(api.POST).toHaveBeenCalledTimes(1);
    expect((vi.mocked(api.POST).mock.calls[0][1] as { body: { items: unknown[] } }).body.items).toHaveLength(2);

    resolve({ data: { linked: [], skipped: [] } });
    await waitFor(() => expect(screen.getByRole('button', { name: /Confirm all/i })).not.toBeDisabled());
  });

  it('empty result: message, and no stale hint when coverage is recent', async () => {
    route([], { coverageEnd: toCalendarDate(new Date()), unresolvedCount: 3 });
    renderPanel();
    await findMatches();
    expect(await screen.findByText('No bank credits match your unmatched dividends.')).toBeInTheDocument();
    expect(screen.queryByText(/Your bank data stops at/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirm all/i })).not.toBeInTheDocument();
  });

  it('empty result with unresolved dividends and bank data older than 30 days shows the stale hint', async () => {
    route([], { coverageEnd: '2020-01-15', unresolvedCount: 3 });
    renderPanel();
    await findMatches();
    expect(
      await screen.findByText(`Your bank data stops at ${formatDate('2020-01-15')} — import a newer statement.`),
    ).toBeInTheDocument();
  });

  it('no stale hint when there is nothing unresolved, or no coverage at all', async () => {
    route([], { coverageEnd: '2020-01-15', unresolvedCount: 0 });
    const a = renderPanel();
    await findMatches();
    await screen.findByText('No bank credits match your unmatched dividends.');
    expect(screen.queryByText(/Your bank data stops at/)).not.toBeInTheDocument();
    a.unmount();

    route([], { coverageEnd: null, unresolvedCount: 3 });
    renderPanel();
    await findMatches();
    await screen.findByText('No bank credits match your unmatched dividends.');
    expect(screen.queryByText(/Your bank data stops at/)).not.toBeInTheDocument();
  });

  it('renders the unrecorded credits section under a divider', () => {
    renderPanel();
    expect(screen.getByText('Unrecorded dividend credits')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Scan bank credits/i })).toBeInTheDocument();
  });
});
