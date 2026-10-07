import { QueryClientProvider } from '@tanstack/react-query';
import { act,fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const dialogProps: Record<string, unknown>[] = [];
vi.mock('@/app/(protected)/investments/dialogs/DividendDialog', () => ({
  DividendDialog: (props: Record<string, unknown>) => {
    dialogProps.push(props);
    return <div data-testid="dividend-dialog">{props.trigger as ReactNode}</div>;
  },
}));

import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { AccountType } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

import type { UnrecordedCredit } from '../types';
import { UnrecordedCreditsPanel } from '../UnrecordedCreditsPanel';
import { useUnrecordedCredits } from '../useUnrecordedCredits';
import { makeTxn } from './fixtures';

const UNRECORDED = '/api/v1/investments/dividends/reconciliation/unrecorded';
const accounts: Account[] = [{ id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT }];

const hint = (over = {}) => ({
  holdingId: 'h1',
  brokerAccountId: 'broker-1',
  brokerName: 'Zerodha',
  instrumentId: 'inst-1',
  instrumentName: 'Infosys Limited',
  symbol: 'INFY',
  nameScore: 0.9,
  ...over,
});

function route(items: UnrecordedCredit[]) {
  vi.mocked(api.GET).mockImplementation((path: unknown) => {
    if (path === '/api/v1/accounts') return Promise.resolve({ data: accounts } as never);
    if (path === UNRECORDED) return Promise.resolve({ data: { items, from: '2025-10-01', to: '2026-10-01' } } as never);
    return Promise.resolve({ data: null } as never);
  });
}

const credit = (hints: ReturnType<typeof hint>[], txn = makeTxn({ id: 'tx-9', amount: 1234.5, date: '2026-03-12' })): UnrecordedCredit => ({
  transaction: txn,
  holdingHints: hints,
});

const scanButton = () => screen.getByRole('button', { name: /Scan bank credits/i });

describe('UnrecordedCreditsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dialogProps.length = 0;
    route([]);
  });

  it('does not scan until clicked and shows the pre-scan hint', () => {
    renderWithQuery(<UnrecordedCreditsPanel brokerAccounts={[]} positions={[]} />);
    expect(screen.getByText(/Scan your bank credits for dividend-like money-in/)).toBeInTheDocument();
    expect(api.GET).not.toHaveBeenCalledWith(UNRECORDED, expect.anything());
  });

  it('scans on demand and shows the empty state', async () => {
    renderWithQuery(<UnrecordedCreditsPanel brokerAccounts={[]} positions={[]} />);
    fireEvent.click(scanButton());
    expect(await screen.findByText('No unrecorded dividend-like credits in the last year.')).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith(UNRECORDED, { params: { query: {} } });
  });

  it('renders the credit row and one "Record for" trigger per holding hint with prefill props', async () => {
    route([
      credit([
        hint(),
        hint({ holdingId: 'h2', brokerAccountId: 'broker-2', brokerName: 'Groww', instrumentId: 'inst-2', symbol: null, instrumentName: 'Wipro Limited' }),
      ]),
    ]);
    const brokers = [{ id: 'broker-1', name: 'Zerodha' }] as never[];
    renderWithQuery(<UnrecordedCreditsPanel brokerAccounts={brokers} positions={[]} />);
    fireEvent.click(scanButton());

    expect(await screen.findByText('ACH CR INFOSYS DIVIDEND')).toBeInTheDocument();
    expect(screen.getByText('+₹1,234.50')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(`HDFC Savings · ${formatDate('2026-03-12')}`)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /Record for INFY · Zerodha/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Record for Wipro Limited · Groww/ })).toBeInTheDocument();

    const props = dialogProps.filter((p) => p.initialInstrumentId);
    expect(props).toHaveLength(2);
    expect(props[0]).toMatchObject({
      brokerAccounts: brokers,
      initialAmount: 1234.5,
      initialPayDate: '2026-03-12',
      linkTransactionId: 'tx-9',
      initialBrokerAccountId: 'broker-1',
      initialInstrumentId: 'inst-1',
    });
    expect(props[1]).toMatchObject({ initialBrokerAccountId: 'broker-2', initialInstrumentId: 'inst-2' });
  });

  it('with no hints renders a single plain Record trigger prefilled with amount/date/link only', async () => {
    route([credit([])]);
    renderWithQuery(<UnrecordedCreditsPanel brokerAccounts={[]} positions={[]} />);
    fireEvent.click(scanButton());

    expect(await screen.findByRole('button', { name: /Record…/ })).toBeInTheDocument();
    expect(screen.getAllByTestId('dividend-dialog')).toHaveLength(1);
    const last = dialogProps[dialogProps.length - 1];
    expect(last).toMatchObject({ initialAmount: 1234.5, initialPayDate: '2026-03-12', linkTransactionId: 'tx-9' });
    expect(last.initialInstrumentId).toBeUndefined();
    expect(last.initialBrokerAccountId).toBeUndefined();
  });

  it('after a dividend is recorded: invalidates, rescans and notifies the page', async () => {
    route([credit([hint()])]);
    const onChanged = vi.fn();
    const { queryClient } = renderWithQuery(
      <UnrecordedCreditsPanel brokerAccounts={[]} positions={[]} onChanged={onChanged} />,
    );
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    fireEvent.click(scanButton());
    await screen.findByText('ACH CR INFOSYS DIVIDEND');

    route([]);
    const onSuccess = dialogProps[dialogProps.length - 1].onSuccess as () => Promise<void>;
    await act(async () => {
      await onSuccess();
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.investments.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
    expect(await screen.findByText('No unrecorded dividend-like credits in the last year.')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});

describe('useUnrecordedCredits', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is lazy, then exposes the scanned items', async () => {
    route([credit([hint()])]);
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUnrecordedCredits(), { wrapper });
    expect(result.current.fetched).toBe(false);
    expect(result.current.items).toEqual([]);
    expect(api.GET).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.scan();
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(queryClient.getQueryData(keys.investments.dividendUnrecorded({}))).toBeDefined();
  });
});
