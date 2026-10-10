import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/components/reports/underlying/RowBreakdownDialog', () => ({
  RowBreakdownDialog: ({ onOpenChange, ...p }: { onOpenChange: (o: boolean) => void }) => (
    <div data-testid="breakdown-dialog" data-props={JSON.stringify(p)}>
      <button onClick={() => onOpenChange(false)}>close dialog</button>
    </div>
  ),
}));

import { Sparkline,sparklinePoints } from '@/components/charts/Sparkline';
import {
  AccountTileWidget,
  AccountTypeSubtitle,
  trendValues,
} from '@/components/dashboards/widgets/account_tile/AccountTileWidget';
import { api, ApiError } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { account, card, dialogProps } from './cardsSpendingFixtures';

type Routes = Record<string, unknown>;

/** GET mock answering by path; an Error value rejects. */
function routes(map: Routes) {
  vi.mocked(api.GET).mockImplementation(((path: string) => {
    const v = map[path];
    if (v instanceof Error) return Promise.reject(v);
    if (v === undefined) return new Promise(() => {});
    return Promise.resolve({ data: v });
  }) as never);
}

const series = [
  { date: '2026-10-08', balance: -1000 },
  { date: '2026-10-09', balance: -3000 },
  { date: '2026-10-10', balance: -2500 },
];

describe('Sparkline', () => {
  it('maps values into the box (higher = nearer the top); flat series sit mid-height', () => {
    expect(sparklinePoints([0, 10])).toBe('0,30 100,2');
    expect(sparklinePoints([5, 5, 5])).toBe('0,16 50,16 100,16');
    expect(sparklinePoints([1])).toBe('');
  });

  it('draws nothing under two points; labelled when given a label, else decorative', () => {
    const { container, unmount } = render(<Sparkline values={[1]} />);
    expect(container).toBeEmptyDOMElement();
    unmount();
    const { rerender } = render(<Sparkline values={[1, 2]} label="Trend" />);
    expect(screen.getByRole('img', { name: 'Trend' })).toBeInTheDocument();
    rerender(<Sparkline values={[1, 2]} area={false} />);
    expect(screen.getByTestId('sparkline')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('sparkline').querySelector('polygon')).toBeNull();
  });
});

describe('AccountTileWidget', () => {
  beforeEach(() => vi.resetAllMocks());

  it('a card heads with what is owed, positive, plus the owed trend; fetches 30 days', async () => {
    routes({
      '/api/v1/accounts/{id}': card({ id: 'c1', name: 'Atlas', balance: -2500 }),
      '/api/v1/accounts/{id}/balance-series': series,
    });
    renderWithQuery(<AccountTileWidget accountId="c1" />);
    expect(await screen.findByText('Outstanding')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /— view Atlas balance breakdown$/ })).toHaveTextContent('₹2,500.00');
    expect(await screen.findByRole('img', { name: 'Atlas, last 30 days' })).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith('/api/v1/accounts/{id}/balance-series', {
      params: { path: { id: 'c1' }, query: { days: 30 } },
    });
    expect(trendValues({ type: 'credit_card' } as never, [-1000, -3000])).toEqual([1000, 3000]);
    expect(trendValues({ type: 'bank_account' } as never, [5, 6])).toEqual([5, 6]);
  });

  it('a card in credit says so', async () => {
    routes({ '/api/v1/accounts/{id}': card({ id: 'c1', name: 'Atlas', balance: 700 }), '/api/v1/accounts/{id}/balance-series': [] });
    renderWithQuery(<AccountTileWidget accountId="c1" />);
    expect(await screen.findByText('In credit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /— view Atlas balance breakdown$/ })).toHaveTextContent('₹700.00');
  });

  it('a bank account shows its balance; under two points no trend is drawn', async () => {
    routes({
      '/api/v1/accounts/{id}': account({ id: 'b1', name: 'HDFC', balance: 284310 }),
      '/api/v1/accounts/{id}/balance-series': [{ date: '2026-10-10', balance: 284310 }],
    });
    renderWithQuery(<AccountTileWidget accountId="b1" />);
    expect(await screen.findByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('₹2,84,310.00')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('sparkline')).not.toBeInTheDocument());
    expect(screen.getByText('HDFC')).toBeInTheDocument();
  });

  it('a broker shows its portfolio value and never asks for a series', async () => {
    routes({ '/api/v1/accounts/{id}': account({ id: 'k1', type: 'broker', name: 'Zerodha', balance: 1000 }) });
    renderWithQuery(<AccountTileWidget accountId="k1" />);
    expect(await screen.findByText('Portfolio value')).toBeInTheDocument();
    expect(api.GET).not.toHaveBeenCalledWith('/api/v1/accounts/{id}/balance-series', expect.anything());
  });

  it('the balance opens the account`s net-worth breakdown', async () => {
    routes({ '/api/v1/accounts/{id}': account({ id: 'b1', name: 'HDFC', balance: 10 }), '/api/v1/accounts/{id}/balance-series': [] });
    renderWithQuery(<AccountTileWidget accountId="b1" />);
    await userEvent.click(await screen.findByRole('button', { name: /— view HDFC balance breakdown$/ }));
    expect(dialogProps(await screen.findByTestId('breakdown-dialog'))).toEqual({
      datasource: 'net_worth', rowId: 'b1', title: 'HDFC', open: true,
    });
    await userEvent.click(screen.getByText('close dialog'));
    expect(screen.queryByTestId('breakdown-dialog')).not.toBeInTheDocument();
  });

  it('loading skeleton; a deleted account; other errors; no account picked', async () => {
    routes({});
    const { unmount } = renderWithQuery(<AccountTileWidget accountId="x" />);
    expect(screen.getByTestId('widget-skeleton')).toBeInTheDocument();
    unmount();

    routes({ '/api/v1/accounts/{id}': new ApiError(404, { code: 'NOT_FOUND', message: 'nope' }) });
    const second = renderWithQuery(<AccountTileWidget accountId="gone" />);
    expect(await screen.findByText('This account no longer exists.', {}, { timeout: 3000 })).toBeInTheDocument();
    second.unmount();

    routes({ '/api/v1/accounts/{id}': new ApiError(500, { code: 'X', message: 'Server down' }) });
    const third = renderWithQuery(<AccountTileWidget accountId="b" />);
    expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('Server down');
    third.unmount();

    renderWithQuery(<AccountTileWidget accountId={null} />);
    expect(screen.getByText('Pick an account in Widget settings.')).toBeInTheDocument();
  });

  it('subtitle: the account type label, "Account" until the list loads', async () => {
    routes({ '/api/v1/accounts': [account({ id: 'g1', type: 'generic' })] });
    renderWithQuery(<AccountTypeSubtitle accountId="g1" />);
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(await screen.findByText('Wallet / Cash')).toBeInTheDocument();
  });
});
